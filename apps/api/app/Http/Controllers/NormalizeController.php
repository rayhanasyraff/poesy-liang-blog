<?php

namespace App\Http\Controllers;

use App\Models\Blog;
use App\Models\BlogVersion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * @OA\Tag(name="Migration", description="Data migration endpoints")
 */
class NormalizeController extends Controller
{
    /**
     * @OA\Post(
     *     path="/migrate/normalize-published-versions",
     *     tags={"Migration"},
     *     summary="Normalize blog version statuses (dry run by default)",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="dry", in="query", @OA\Schema(type="string", default="true")),
     *     @OA\Response(response=200, description="Normalization summary")
     * )
     */
    public function normalize(Request $request): JsonResponse
    {
        $dry = $request->query('dry', 'true') !== 'false';

        $summary = [
            'dry'                      => $dry,
            'blogsScanned'             => 0,
            'legacyVersionsNormalized' => 0,
            'committedVersionsCreated' => 0,
            'draftVersionsCreated'     => 0,
            'errors'                   => [],
        ];

        $pageSize = 100;
        $offset   = 0;

        while (true) {
            $blogs = Blog::orderBy('id')->limit($pageSize)->offset($offset)->get();

            if ($blogs->isEmpty()) break;

            $summary['blogsScanned'] += $blogs->count();
            $offset += $pageSize;

            foreach ($blogs as $blog) {
                $versions = BlogVersion::where('blog_id', $blog->id)->limit(200)->get();

                // Pass 1: 'published' → 'committed'
                foreach ($versions as $v) {
                    if ($v->status !== 'published') continue;
                    $summary['legacyVersionsNormalized']++;
                    if ($dry) continue;

                    $updated = BlogVersion::where('id', $v->id)
                        ->where('blog_id', $blog->id)
                        ->update(['status' => 'committed']);

                    if (!$updated) {
                        $summary['errors'][] = ['blogId' => $blog->id, 'step' => "normalize-version-{$v->id}", 'error' => 'Update failed'];
                        $summary['legacyVersionsNormalized']--;
                    } else {
                        $v->status = 'committed';
                    }
                }

                // Pass 2: backfill published blogs with no committed version
                $isPublished = in_array($blog->blog_status, ['published', 'publish']);
                if (!$isPublished) continue;

                $hasCommitted = $versions->contains(fn($v) => in_array($v->status, ['committed', 'published']));
                if ($hasCommitted) continue;

                $summary['committedVersionsCreated']++;
                $summary['draftVersionsCreated']++;
                if ($dry) continue;

                $now         = now()->toDateTimeString();
                $publishedAt = $blog->blog_date_published ?? $now;

                $nextVer = (int) BlogVersion::where('blog_id', $blog->id)->max('version_number') + 1;

                try {
                    $v1 = BlogVersion::create([
                        'blog_id'          => $blog->id,
                        'version_number'   => $nextVer,
                        'blog_title'       => $blog->blog_title       ?? 'Untitled',
                        'blog_excerpt'     => $blog->blog_excerpt      ?? '',
                        'blog_content'     => $blog->blog_content      ?? '',
                        'tags'             => $blog->tags              ?? null,
                        'status'           => 'committed',
                        'created_by'       => 0,
                        'created_at'       => $publishedAt,
                        'blog_visibility'  => $blog->blog_visibility   ?? 'public',
                        'comment_status'   => $blog->comment_status    ?? 'open',
                        'like_visibility'  => $blog->like_visibility   ?? 'open',
                        'view_visibility'  => $blog->view_visibility   ?? 'open',
                        'like_count'       => (int)($blog->like_count  ?? 0),
                        'view_count'       => (int)($blog->view_count  ?? 0),
                        'published_at'     => $publishedAt,
                    ]);

                    Blog::where('id', $blog->id)->update(['current_published_version_id' => $v1->id]);

                    $nextVer2 = $nextVer + 1;
                    BlogVersion::create([
                        'blog_id'          => $blog->id,
                        'version_number'   => $nextVer2,
                        'blog_title'       => $blog->blog_title       ?? 'Untitled',
                        'blog_excerpt'     => $blog->blog_excerpt      ?? '',
                        'blog_content'     => $blog->blog_content      ?? '',
                        'tags'             => $blog->tags              ?? null,
                        'status'           => 'draft',
                        'created_by'       => 0,
                        'created_at'       => $now,
                        'blog_visibility'  => $blog->blog_visibility   ?? 'public',
                        'comment_status'   => $blog->comment_status    ?? 'open',
                        'like_visibility'  => $blog->like_visibility   ?? 'open',
                        'view_visibility'  => $blog->view_visibility   ?? 'open',
                        'like_count'       => (int)($blog->like_count  ?? 0),
                        'view_count'       => (int)($blog->view_count  ?? 0),
                        'draft_saved_at'   => $now,
                    ]);
                } catch (\Throwable $e) {
                    $summary['errors'][] = ['blogId' => $blog->id, 'step' => 'backfill', 'error' => $e->getMessage()];
                    $summary['committedVersionsCreated']--;
                    $summary['draftVersionsCreated']--;
                }
            }

            if ($blogs->count() < $pageSize) break;
        }

        return response()->json(['success' => true, 'summary' => $summary]);
    }
}
