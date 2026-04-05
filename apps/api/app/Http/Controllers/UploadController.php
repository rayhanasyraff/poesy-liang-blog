<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class UploadController extends Controller
{
    private const ALLOWED_TYPES = [
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'video/mp4', 'video/webm', 'video/quicktime',
    ];

    private const MAX_SIZE_BYTES = 256 * 1024 * 1024; // 256 MB

    public function upload(Request $request): JsonResponse
    {
        // 1. Validate file
        if (!$request->hasFile('file')) {
            return response()->json(['success' => false, 'error' => 'No file provided'], 422);
        }

        $file = $request->file('file');
        $mime = $file->getMimeType();

        if (!in_array($mime, self::ALLOWED_TYPES)) {
            return response()->json(['success' => false, 'error' => 'Unsupported file type'], 422);
        }

        if ($file->getSize() > self::MAX_SIZE_BYTES) {
            return response()->json(['success' => false, 'error' => 'File too large (max 256 MB)'], 422);
        }

        // 2. Decode UPLOADTHING_TOKEN → apiKey, appId, regions
        $token = env('UPLOADTHING_TOKEN');
        if (!$token) {
            return response()->json(['success' => false, 'error' => 'Upload storage not configured'], 500);
        }

        $decoded = json_decode(base64_decode($token), true);
        $apiKey  = $decoded['apiKey'] ?? null;

        if (!$apiKey) {
            return response()->json(['success' => false, 'error' => 'Invalid upload storage token'], 500);
        }

        // 3. Prepare upload — request presigned URL + fileKey from UploadThing
        $prepareRes = Http::withHeaders([
            'x-uploadthing-api-key' => $apiKey,
            'Content-Type'          => 'application/json',
        ])->post('https://api.uploadthing.com/v7/prepareUpload', [
            'fileName'           => $file->getClientOriginalName(),
            'fileSize'           => $file->getSize(),
            'fileType'           => $mime,
            'acl'                => 'public-read',
            'contentDisposition' => 'inline',
        ]);

        if (!$prepareRes->successful()) {
            return response()->json([
                'success' => false,
                'error'   => 'Failed to prepare upload: ' . $prepareRes->body(),
            ], 502);
        }

        $json = $prepareRes->json();
        // UploadThing may return a single object or an array of objects
        $fileData = (isset($json[0]) && is_array($json[0])) ? $json[0] : $json;

        $fileKey      = $fileData['key']  ?? ($fileData['fileKey']  ?? null);
        $presignedUrl = $fileData['url']  ?? ($fileData['uploadUrl'] ?? null);

        if (!$fileKey || !$presignedUrl) {
            return response()->json([
                'success' => false,
                'error'   => 'Unexpected prepareUpload response: ' . $prepareRes->body(),
            ], 502);
        }

        // 4. Upload file content to UploadThing ingest URL
        $ingestRes = Http::withBody(
            file_get_contents($file->getRealPath()),
            $mime
        )->put($presignedUrl);

        if (!$ingestRes->successful()) {
            return response()->json([
                'success' => false,
                'error'   => 'Failed to upload to storage: ' . $ingestRes->body(),
            ], 502);
        }

        // 5. Return public CDN URL
        return response()->json([
            'success' => true,
            'url'     => "https://utfs.io/f/{$fileKey}",
        ]);
    }
}
