<?php

namespace App\Http\Controllers;

use App\Models\BlogVersion;
use App\Services\VersioningService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @OA\Tag(name="Blog Versions", description="Blog versioning operations")
 */
class BlogVersionController extends Controller
{
    private VersioningService $versioning;

    public function __construct(VersioningService $versioning)
    {
        $this->versioning = $versioning;
    }

    /**
     * @OA\Get(
     *     path="/blogs/{id}/versions",
     *     tags={"Blog Versions"},
     *     summary="List all versions for a blog",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="limit", in="query", @OA\Schema(type="integer", default=100)),
     *     @OA\Parameter(name="offset", in="query", @OA\Schema(type="integer", default=0)),
     *     @OA\Response(response=200, description="Success")
     * )
     */
    public function index(Request $request, int $id): JsonResponse
    {
        $limit  = (int)$request->query('limit', 100);
        $offset = (int)$request->query('offset', 0);

        $query = BlogVersion::where('blog_id', $id);

        $filterable = [
            'parent_version_id', 'version_number', 'blog_title', 'blog_excerpt',
            'blog_content', 'tags', 'commit_message', 'status', 'created_by',
            'created_at', 'blog_visibility', 'comment_status', 'like_visibility',
            'view_visibility', 'like_count', 'view_count',
        ];

        foreach ($filterable as $col) {
            $val = $request->query($col);
            if ($val === null || $val === '') continue;
            if (strpos($val, '%') !== false || strpos($val, '*') !== false) {
                $query->where($col, 'LIKE', str_replace('*', '%', $val));
            } else {
                $query->where($col, $val);
            }
        }

        $total = (clone $query)->count();
        $rows  = $query->orderByDesc('version_number')->limit($limit)->offset($offset)->get();

        return response()->json([
            'success'       => true,
            'blog_id'       => $id,
            'total_rows'    => $total,
            'returned_rows' => $rows->count(),
            'limit'         => $limit,
            'offset'        => $offset,
            'data'          => $rows,
        ]);
    }

    /**
     * @OA\Get(
     *     path="/blogs/{id}/versions/{verId}",
     *     tags={"Blog Versions"},
     *     summary="Get a specific version",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="verId", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Success"),
     *     @OA\Response(response=404, description="Not found")
     * )
     */
    public function show(int $id, int $verId): JsonResponse
    {
        $version = BlogVersion::where('id', $verId)->where('blog_id', $id)->first();
        if (!$version) {
            return response()->json(['success' => false, 'error' => 'Version not found'], 404);
        }
        return response()->json(['success' => true, 'data' => $version]);
    }

    /**
     * @OA\Post(
     *     path="/blogs/{id}/versions/draft",
     *     tags={"Blog Versions"},
     *     summary="Save or update a draft version",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Success")
     * )
     */
    public function saveDraft(Request $request, int $id): JsonResponse
    {
        $body = $request->all();

        if (empty($body['blog_title']) && empty($body['blog_content'])) {
            return response()->json(['success' => false, 'error' => 'blog_title or blog_content is required'], 400);
        }

        $result = $this->versioning->saveDraft($id, [
            'blog_title'      => $body['blog_title']      ?? 'Untitled',
            'blog_content'    => $body['blog_content']    ?? '',
            'blog_excerpt'    => $body['blog_excerpt']    ?? '',
            'tags'            => $body['tags']            ?? null,
            'blog_visibility' => $body['blog_visibility'] ?? null,
            'comment_status'  => $body['comment_status']  ?? null,
            'like_visibility' => $body['like_visibility'] ?? null,
            'view_visibility' => $body['view_visibility'] ?? null,
        ]);

        return response()->json(['success' => true, 'data' => $result]);
    }

    /**
     * @OA\Post(
     *     path="/blogs/{id}/versions/publish",
     *     tags={"Blog Versions"},
     *     summary="Publish the current draft",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Success")
     * )
     */
    public function publishDraft(Request $request, int $id): JsonResponse
    {
        $body = $request->all();

        $result = $this->versioning->publishDraft($id, [
            'blog_title'      => $body['blog_title']      ?? 'Untitled',
            'blog_content'    => $body['blog_content']    ?? '',
            'blog_excerpt'    => $body['blog_excerpt']    ?? '',
            'tags'            => $body['tags']            ?? null,
            'blog_visibility' => $body['blog_visibility'] ?? null,
            'comment_status'  => $body['comment_status']  ?? null,
            'like_visibility' => $body['like_visibility'] ?? null,
            'view_visibility' => $body['view_visibility'] ?? null,
        ]);

        return response()->json(['success' => true, 'data' => $result]);
    }

    /**
     * @OA\Post(
     *     path="/blogs/{id}/versions/{verId}/publish",
     *     tags={"Blog Versions"},
     *     summary="Publish a specific historical version",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="verId", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Success")
     * )
     */
    public function publishVersion(int $id, int $verId): JsonResponse
    {
        $this->versioning->publishSpecificVersion($id, $verId);
        return response()->json(['success' => true]);
    }

    /**
     * @OA\Post(
     *     path="/blogs/{id}/versions/{verId}/revert",
     *     tags={"Blog Versions"},
     *     summary="Revert to a historical version (creates new draft)",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="verId", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Success")
     * )
     */
    public function revert(int $id, int $verId): JsonResponse
    {
        $result = $this->versioning->revertToVersion($id, $verId);
        return response()->json(['success' => true, 'data' => $result]);
    }

    /**
     * @OA\Patch(
     *     path="/blogs/{id}/settings",
     *     tags={"Blog Versions"},
     *     summary="Update blog-level settings",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Success")
     * )
     */
    public function updateSettings(Request $request, int $id): JsonResponse
    {
        $this->versioning->updateSettings($id, $request->all());
        return response()->json(['success' => true]);
    }

    /**
     * @OA\Post(
     *     path="/blogs/{id}/unpublish",
     *     tags={"Blog Versions"},
     *     summary="Unpublish a blog",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Success")
     * )
     */
    public function unpublish(int $id): JsonResponse
    {
        $this->versioning->unpublishBlog($id);
        return response()->json(['success' => true]);
    }
}
