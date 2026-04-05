<?php

namespace App\Http\Controllers;

use App\Models\Blog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * @OA\Tag(name="Likes", description="Blog like operations")
 */
class LikeController extends Controller
{
    private function resolveIdentifier(Request $request): array
    {
        $fingerprint = $request->header('X-Device-Fingerprint');
        $ip          = $request->ip();
        return [$fingerprint ?: null, $ip];
    }

    private function hasLiked(int $blogId, ?string $fingerprint, string $ip): bool
    {
        $query = DB::table('blog_likes')->where('blog_id', $blogId);

        if ($fingerprint) {
            return $query->where('fingerprint', $fingerprint)->exists();
        }

        return $query->where('ip_address', $ip)->exists();
    }

    /**
     * @OA\Get(
     *     path="/blogs/{id}/likes",
     *     tags={"Likes"},
     *     summary="Get like count and whether the requester has liked",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Success"),
     *     @OA\Response(response=404, description="Not found")
     * )
     */
    public function get(int $id, Request $request): JsonResponse
    {
        $blog = Blog::select('id', 'like_count')->find($id);
        if (!$blog) {
            return response()->json(['success' => false, 'error' => 'Blog not found'], 404);
        }

        [$fingerprint, $ip] = $this->resolveIdentifier($request);

        return response()->json([
            'success'   => true,
            'likes'     => (int) $blog->like_count,
            'has_liked' => $this->hasLiked($id, $fingerprint, $ip),
        ]);
    }

    /**
     * @OA\Post(
     *     path="/blogs/{id}/likes",
     *     tags={"Likes"},
     *     summary="Like a blog (once per device/IP)",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Success")
     * )
     */
    public function add(int $id, Request $request): JsonResponse
    {
        $blog = Blog::select('id', 'like_count')->find($id);
        if (!$blog) {
            return response()->json(['success' => false, 'error' => 'Blog not found'], 404);
        }

        [$fingerprint, $ip] = $this->resolveIdentifier($request);

        if (!$this->hasLiked($id, $fingerprint, $ip)) {
            DB::table('blog_likes')->insert([
                'blog_id'     => $id,
                'ip_address'  => $ip,
                'fingerprint' => $fingerprint,
            ]);
            Blog::where('id', $id)->increment('like_count');
        }

        $likes = (int) Blog::where('id', $id)->value('like_count');

        return response()->json([
            'success'   => true,
            'likes'     => $likes,
            'has_liked' => true,
        ]);
    }

    /**
     * @OA\Delete(
     *     path="/blogs/{id}/likes",
     *     tags={"Likes"},
     *     summary="Unlike a blog",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Success")
     * )
     */
    public function remove(int $id, Request $request): JsonResponse
    {
        $blog = Blog::select('id', 'like_count')->find($id);
        if (!$blog) {
            return response()->json(['success' => false, 'error' => 'Blog not found'], 404);
        }

        [$fingerprint, $ip] = $this->resolveIdentifier($request);

        $query   = DB::table('blog_likes')->where('blog_id', $id);
        $deleted = $fingerprint
            ? $query->where('fingerprint', $fingerprint)->delete()
            : $query->where('ip_address', $ip)->delete();

        if ($deleted) {
            Blog::where('id', $id)->update([
                'like_count' => max(0, (int) $blog->like_count - 1),
            ]);
        }

        $likes = (int) Blog::where('id', $id)->value('like_count');

        return response()->json([
            'success'   => true,
            'likes'     => $likes,
            'has_liked' => false,
        ]);
    }
}
