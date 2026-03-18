<?php

namespace App\Http\Controllers;

use App\Models\Blog;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Tag(name="Likes", description="Blog like operations")
 */
class LikeController extends Controller
{
    /**
     * @OA\Get(
     *     path="/blogs/{id}/likes",
     *     tags={"Likes"},
     *     summary="Get like count for a blog",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Success"),
     *     @OA\Response(response=404, description="Not found")
     * )
     */
    public function get(int $id): JsonResponse
    {
        $blog = Blog::select('id', 'like_count')->find($id);
        if (!$blog) {
            return response()->json(['success' => false, 'error' => 'Blog not found'], 404);
        }
        return response()->json(['success' => true, 'likes' => (int)$blog->like_count]);
    }

    /**
     * @OA\Post(
     *     path="/blogs/{id}/likes",
     *     tags={"Likes"},
     *     summary="Increment like count",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Success")
     * )
     */
    public function add(int $id): JsonResponse
    {
        $affected = Blog::where('id', $id)->increment('like_count');
        if (!$affected) {
            return response()->json(['success' => false, 'error' => 'Blog not found'], 404);
        }
        $likes = (int)Blog::where('id', $id)->value('like_count');
        return response()->json(['success' => true, 'likes' => $likes]);
    }

    /**
     * @OA\Delete(
     *     path="/blogs/{id}/likes",
     *     tags={"Likes"},
     *     summary="Decrement like count",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Success")
     * )
     */
    public function remove(int $id): JsonResponse
    {
        $blog = Blog::select('id', 'like_count')->find($id);
        if (!$blog) {
            return response()->json(['success' => false, 'error' => 'Blog not found'], 404);
        }
        $newCount = max(0, (int)$blog->like_count - 1);
        Blog::where('id', $id)->update(['like_count' => $newCount]);
        return response()->json(['success' => true, 'likes' => $newCount]);
    }
}
