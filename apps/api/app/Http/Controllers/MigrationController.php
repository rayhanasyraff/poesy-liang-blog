<?php

namespace App\Http\Controllers;

use App\Models\Blog;
use App\Services\WpPostService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

/**
 * @OA\Tag(name="Migration", description="Data migration endpoints")
 */
class MigrationController extends Controller
{
    private WpPostService $wpPostService;

    public function __construct(WpPostService $wpPostService)
    {
        $this->wpPostService = $wpPostService;
    }

    /**
     * @OA\Post(
     *     path="/migrate-wp-posts-journals-into-blogs",
     *     tags={"Migration"},
     *     summary="Migrate WordPress posts to blogs table",
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(response=200, description="Migration summary")
     * )
     */
    public function migrate(): JsonResponse
    {
        $comPosts = $this->wpPostService->fetchAll('com');
        $netPosts = $this->wpPostService->fetchAll('net');
        $combined = WpPostService::combineAndSort($comPosts, $netPosts);

        $successList = [];
        $failedList  = [];

        foreach ($combined as $blog) {
            $source     = $blog['_source'];
            $originalId = $blog['_original_id'];
            $origData   = $blog['_original_data'];
            unset($blog['_source'], $blog['_original_id'], $blog['_original_data']);

            try {
                $id = $this->insertBlog($blog);

                $successList[] = [
                    'id'               => $id,
                    'title'            => $blog['blog_title'],
                    'date'             => $blog['blog_date_published'],
                    'source'           => $source,
                    'original_id'      => $originalId,
                    'original_data'    => $origData,
                    'transformed_data' => $blog,
                    'debug_info' => [
                        'blog_name'           => $blog['blog_name'],
                        'blog_status'         => $blog['blog_status'],
                        'comment_status'      => $blog['comment_status'],
                        'notification_status' => $blog['notification_status'],
                        'has_content'         => !empty($blog['blog_content']),
                        'content_length'      => strlen($blog['blog_content'] ?? ''),
                    ],
                ];
            } catch (\Throwable $e) {
                Log::error('Migration insert failed: ' . $e->getMessage());
                $failedList[] = [
                    'title'            => $blog['blog_title'],
                    'date'             => $blog['blog_date_published'],
                    'source'           => $source,
                    'original_id'      => $originalId,
                    'original_data'    => $origData,
                    'transformed_data' => $blog,
                    'error'            => $e->getMessage(),
                    'debug_info' => [
                        'blog_name'           => $blog['blog_name'],
                        'blog_status'         => $blog['blog_status'],
                        'comment_status'      => $blog['comment_status'],
                        'notification_status' => $blog['notification_status'],
                        'has_content'         => !empty($blog['blog_content']),
                        'content_length'      => strlen($blog['blog_content'] ?? ''),
                    ],
                ];
            }
        }

        return response()->json([
            'success' => true,
            'summary' => [
                'timestamp'       => now()->toIso8601String(),
                'total_processed' => count($combined),
                'successful'      => count($successList),
                'failed'          => count($failedList),
                'success_data'    => $successList,
                'failed_data'     => $failedList,
            ],
        ]);
    }

    private function insertBlog(array $data): int
    {
        $now    = now()->toDateTimeString();
        $nowGmt = now()->utc()->toDateTimeString();

        $blog = Blog::create([
            'blog_name'               => $data['blog_name']               ?? '',
            'blog_title'              => $data['blog_title']              ?? '',
            'blog_excerpt'            => $data['blog_excerpt']            ?? '',
            'blog_content'            => $data['blog_content']            ?? '',
            'blog_status'             => $data['blog_status']             ?? 'draft',
            'comment_status'          => $data['comment_status']          ?? 'close',
            'notification_status'     => $data['notification_status']     ?? 'none',
            'blog_date_published'     => $data['blog_date_published']     ?? $now,
            'blog_date_published_gmt' => $data['blog_date_published_gmt'] ?? $nowGmt,
            'blog_date_modified'      => $data['blog_date_modified']      ?? $now,
            'blog_date_modified_gmt'  => $data['blog_date_modified_gmt']  ?? $nowGmt,
            'blog_date_created'       => $data['blog_date_created']       ?? $now,
            'blog_date_created_gmt'   => $data['blog_date_created_gmt']   ?? $nowGmt,
            'tags'                    => $data['tags']                    ?? null,
            'blog_visibility'         => $data['blog_visibility']         ?? 'private',
            'like_count'              => (int)($data['like_count']        ?? 0),
            'like_visibility'         => $data['like_visibility']         ?? 'close',
            'view_count'              => (int)($data['view_count']        ?? 0),
            'view_visibility'         => $data['view_visibility']         ?? 'open',
        ]);

        return $blog->id;
    }
}
