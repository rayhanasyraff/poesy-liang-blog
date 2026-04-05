<?php

namespace App\Http\Controllers;

use App\Models\Blog;
use App\Services\VersioningService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * @OA\Tag(name="Blogs", description="Blog CRUD operations")
 */
class BlogController extends Controller
{
    private $versioning;

    public function __construct(VersioningService $versioning)
    {
        $this->versioning = $versioning;
    }

    private $selectCols = [
        'id', 'blog_name', 'blog_title', 'blog_excerpt',
        'blog_date_published', 'blog_date_published_gmt', 'blog_content', 'blog_status',
        'comment_status', 'notification_status', 'blog_date_modified', 'blog_date_modified_gmt',
        'tags', 'blog_visibility', 'like_count', 'blog_date_created', 'blog_date_created_gmt',
        'like_visibility', 'view_count', 'view_visibility', 'blog_version',
    ];

    /**
     * @OA\Get(
     *     path="/blogs",
     *     tags={"Blogs"},
     *     summary="List all blogs",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="limit", in="query", @OA\Schema(type="integer", default=5000)),
     *     @OA\Parameter(name="offset", in="query", @OA\Schema(type="integer", default=0)),
     *     @OA\Parameter(name="blog_status", in="query", @OA\Schema(type="string")),
     *     @OA\Parameter(name="blog_visibility", in="query", @OA\Schema(type="string")),
     *     @OA\Parameter(name="include_versions", in="query", @OA\Schema(type="boolean")),
     *     @OA\Parameter(name="version_status", in="query", @OA\Schema(type="string")),
     *     @OA\Response(response=200, description="Success")
     * )
     */
    public function index(Request $request): JsonResponse
    {
        $limit  = (int)$request->query('limit', (int)env('PAGINATION_LIMIT', 5000));
        $offset = (int)$request->query('offset', 0);

        $blogStatus     = $request->query('blog_status');
        $blogVisibility = $request->query('blog_visibility');
        $includeVersions = $request->query('include_versions') === 'true';

        $query = Blog::query()->select($this->selectCols);

        $filterable = [
            'id', 'blog_name', 'blog_title', 'blog_excerpt', 'blog_date_published',
            'blog_date_published_gmt', 'blog_content', 'blog_status', 'comment_status',
            'notification_status', 'blog_date_modified', 'blog_date_modified_gmt',
            'tags', 'blog_visibility', 'like_count', 'blog_date_created',
            'blog_date_created_gmt', 'like_visibility', 'view_count', 'view_visibility', 'blog_version',
        ];

        $needsPhpFilter = $blogStatus !== null && $blogVisibility !== null;

        if (!$needsPhpFilter) {
            foreach ($filterable as $col) {
                $val = $request->query($col);
                if ($val === null || $val === '') continue;
                if (strpos($val, '%') !== false || strpos($val, '*') !== false) {
                    $query->where($col, 'LIKE', str_replace('*', '%', $val));
                } else {
                    $query->where($col, $val);
                }
            }
        } else {
            $statusLower = strtolower($blogStatus);
            if ($statusLower === 'published' || $statusLower === 'publish') {
                $query->whereIn('blog_status', ['published', 'publish']);
            } else {
                $query->where('blog_status', $blogStatus);
            }
            $query->where('blog_visibility', $blogVisibility);
        }

        $total  = (clone $query)->count();

        // For public/published listing (used by the non-admin blog list page),
        // sort by creation date (newest first). Otherwise fall back to id desc.
        $statusLower = strtolower((string)$blogStatus);
        if ($statusLower === 'published' || $statusLower === 'publish') {
            // If visibility explicitly requested as public, sort by created date
            if (strtolower((string)$blogVisibility) === 'public') {
                $blogs = $query->orderByDesc('blog_date_created')->limit($limit)->offset($offset)->get()->toArray();
            } else {
                $blogs = $query->orderByDesc('id')->limit($limit)->offset($offset)->get()->toArray();
            }
        } else {
            $blogs = $query->orderByDesc('id')->limit($limit)->offset($offset)->get()->toArray();
        }

        $nextOffset = count($blogs) === $limit ? $offset + $limit : null;

        if (!$includeVersions) {
            return response()->json([
                'success'    => true,
                'count'      => count($blogs),
                'nextOffset' => $nextOffset,
                'data'       => $blogs,
            ]);
        }

        $ids          = array_filter(array_column($blogs, 'id'));
        $versionStatus = $request->query('version_status');

        if ($versionStatus !== null) {
            $versionMap = $this->versioning->getLatestVersionsForBlogs($ids, $versionStatus);
            $data = array_map(function ($blog) use ($versionMap) {
                $v = isset($versionMap[(int)$blog['id']]) ? $versionMap[(int)$blog['id']]->toArray() : null;
                return array_merge($blog, [
                    'latest_version_id'     => $v['id']             ?? null,
                    'latest_version_number' => $v['version_number'] ?? null,
                    'latest_version_status' => $v['status']         ?? null,
                    'latest_blog_title'     => $v['blog_title']     ?? null,
                    'latest_blog_excerpt'   => $v['blog_excerpt']   ?? null,
                    'latest_blog_content'   => $v['blog_content']   ?? null,
                    'latest_tags'           => $v['tags']           ?? null,
                    'latest_draft_saved_at' => $v['draft_saved_at'] ?? null,
                    'latest_published_at'   => $v['published_at']   ?? null,
                ]);
            }, $blogs);
        } else {
            $draftMap     = $this->versioning->getLatestVersionsForBlogs($ids, 'draft');
            $committedMap = $this->versioning->getLatestVersionsForBlogs($ids, 'committed');

            $data = array_map(function ($blog) use ($draftMap, $committedMap) {
                $bid = (int)$blog['id'];
                $d = isset($draftMap[$bid]) ? $draftMap[$bid]->toArray() : null;
                $c = isset($committedMap[$bid]) ? $committedMap[$bid]->toArray() : null;
                return array_merge($blog, [
                    'latest_draft_version_id'         => $d['id']             ?? null,
                    'latest_draft_version_number'     => $d['version_number'] ?? null,
                    'latest_draft_blog_title'         => $d['blog_title']     ?? null,
                    'latest_committed_version_id'     => $c['id']             ?? null,
                    'latest_committed_version_number' => $c['version_number'] ?? null,
                    'latest_committed_blog_title'     => $c['blog_title']     ?? null,
                    'latest_committed_published_at'   => $c['published_at']   ?? null,
                    'latest_version_id'     => $d['id']             ?? $c['id']             ?? null,
                    'latest_version_number' => $d['version_number'] ?? $c['version_number'] ?? null,
                    'latest_version_status' => $d ? 'draft' : ($c ? 'committed' : null),
                    'latest_blog_title'     => $d['blog_title']  ?? $c['blog_title']  ?? null,
                    'latest_blog_excerpt'   => $d['blog_excerpt'] ?? $c['blog_excerpt'] ?? null,
                    'latest_blog_content'   => $d['blog_content'] ?? $c['blog_content'] ?? null,
                    'latest_tags'           => $d['tags']         ?? $c['tags']         ?? null,
                    'latest_draft_saved_at' => $d['draft_saved_at'] ?? null,
                    'latest_published_at'   => $c['published_at']   ?? null,
                ]);
            }, $blogs);
        }

        return response()->json([
            'success'    => true,
            'count'      => count($data),
            'nextOffset' => $nextOffset,
            'data'       => $data,
        ]);
    }

    /**
     * @OA\Get(
     *     path="/blogs/check-slug",
     *     tags={"Blogs"},
     *     summary="Check if a blog slug is available",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="slug", in="query", required=true, @OA\Schema(type="string")),
     *     @OA\Parameter(name="exclude_id", in="query", @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Success")
     * )
     */
    public function checkSlug(Request $request): JsonResponse
    {
        $slug = strtolower(trim($request->query('slug', '')));
        if ($slug === '') {
            return response()->json(['success' => false, 'error' => 'slug is required'], 400);
        }

        $excludeId = $request->query('exclude_id');

        $query = Blog::where('blog_name', $slug)->select('id')->limit(5);
        $rows  = $query->get();

        if ($excludeId !== null) {
            $rows = $rows->filter(function ($r) use ($excludeId) { return (string)$r->id !== (string)$excludeId; });
        }

        return response()->json(['success' => true, 'available' => $rows->isEmpty()]);
    }

    /**
     * @OA\Get(
     *     path="/blogs/{id}",
     *     tags={"Blogs"},
     *     summary="Get a blog by ID",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Success"),
     *     @OA\Response(response=404, description="Not found")
     * )
     */
    public function show(int $id): JsonResponse
    {
        $blog = Blog::select($this->selectCols)->find($id);
        if (!$blog) {
            return response()->json(['success' => false, 'error' => 'Blog not found'], 404);
        }
        return response()->json(['success' => true, 'data' => $blog]);
    }

    /**
     * @OA\Post(
     *     path="/blogs",
     *     tags={"Blogs"},
     *     summary="Create a new blog",
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/Blog")),
     *     @OA\Response(response=201, description="Created"),
     *     @OA\Response(response=400, description="Bad request")
     * )
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'blog_name'  => 'required|string',
            'blog_title' => 'required|string',
        ]);

        $data = $request->all();
        $now  = now()->toDateTimeString();

        $blog = Blog::create([
            'blog_name'           => $data['blog_name'],
            'blog_title'          => $data['blog_title'],
            'blog_excerpt'        => $data['blog_excerpt']        ?? '',
            'blog_content'        => $data['blog_content']        ?? '',
            'blog_status'         => in_array($data['blog_status'] ?? '', ['draft','publish','published'])
                                      ? $data['blog_status'] : 'draft',
            'comment_status'      => $data['comment_status']      ?? 'close',
            'notification_status' => $data['notification_status'] ?? 'none',
            'blog_date_created'   => $now,
            'blog_date_created_gmt' => now()->utc()->toDateTimeString(),
            'tags'                => $data['tags']                ?? null,
            'blog_visibility'     => $data['blog_visibility']     ?? 'private',
            'like_count'          => (int)($data['like_count']    ?? 0),
            'like_visibility'     => $data['like_visibility']     ?? 'close',
            'view_count'          => (int)($data['view_count']    ?? 0),
            'view_visibility'     => $data['view_visibility']     ?? 'open',
            'blog_version'        => (int)($data['blog_version']  ?? 1),
        ]);

        try {
            $this->versioning->saveDraft($blog->id, [
                'blog_title'      => $blog->blog_title,
                'blog_content'    => $blog->blog_content,
                'blog_excerpt'    => $blog->blog_excerpt,
                'tags'            => $blog->tags,
                'blog_visibility' => $blog->blog_visibility !== 'private' ? $blog->blog_visibility : 'public',
                'comment_status'  => $blog->comment_status,
                'like_visibility' => $blog->like_visibility,
                'view_visibility' => $blog->view_visibility,
            ]);
        } catch (\Throwable $e) {
            Log::warning("Blog {$blog->id} created but failed to create v1 draft: " . $e->getMessage());
        }

        return response()->json(['success' => true, 'data' => ['id' => $blog->id]], 201);
    }

    /**
     * @OA\Delete(
     *     path="/blogs/{id}",
     *     tags={"Blogs"},
     *     summary="Delete a blog",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Success")
     * )
     */
    public function destroy(int $id): JsonResponse
    {
        $deleted = Blog::where('id', $id)->delete();
        return response()->json(['success' => true, 'deleted' => $deleted > 0]);
    }

    public function incrementView(int $id): JsonResponse
    {
        $blog = Blog::select('id', 'view_count', 'view_visibility')->find($id);
        if (!$blog) {
            return response()->json(['success' => false, 'error' => 'Blog not found'], 404);
        }

        Blog::where('id', $id)->increment('view_count');

        return response()->json([
            'success'    => true,
            'view_count' => (int) $blog->view_count + 1,
        ]);
    }
}
