<?php

namespace App\Http\Controllers;

use App\Services\WpPostService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @OA\Tag(name="WordPress Posts", description="WordPress post proxy endpoints")
 */
class WpPostController extends Controller
{
    private $wpPostService;

    public function __construct(WpPostService $wpPostService)
    {
        $this->wpPostService = $wpPostService;
    }

    /**
     * @OA\Get(
     *     path="/",
     *     tags={"Health"},
     *     summary="API health check",
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(response=200, description="Success")
     * )
     */
    public function health(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Poesy Liang Blog API',
            'version' => '3.0.0',
            'framework' => 'Laravel ' . app()->version(),
            'endpoints' => [
                'GET /poesyliang.com/wp-posts' => 'Get wp_posts from poesyliang.com',
                'GET /poesyliang.net/wp-posts' => 'Get wp_posts from poesyliang.net',
                'GET /blogs'                   => 'Get all blogs',
                'GET /blogs/{id}'              => 'Get blog by ID',
                'POST /blogs'                  => 'Create a new blog',
                'POST /migrate-wp-posts-journals-into-blogs' => 'Migrate wp_posts to blogs',
            ],
        ]);
    }

    /**
     * @OA\Get(
     *     path="/poesyliang.com/wp-posts",
     *     tags={"WordPress Posts"},
     *     summary="Fetch posts from poesyliang.com archive",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="limit", in="query", @OA\Schema(type="integer")),
     *     @OA\Parameter(name="offset", in="query", @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Success")
     * )
     */
    public function getFromCom(Request $request): JsonResponse
    {
        $limit  = (int)$request->query('limit', (int)env('PAGINATION_LIMIT', 5000));
        $offset = (int)$request->query('offset', 0);

        $posts = $this->wpPostService->fetchPage2('com', $limit, $offset);
        return response()->json(['success' => true, 'count' => count($posts), 'data' => $posts]);
    }

    /**
     * @OA\Get(
     *     path="/poesyliang.net/wp-posts",
     *     tags={"WordPress Posts"},
     *     summary="Fetch posts from poesyliang.net archive",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="limit", in="query", @OA\Schema(type="integer")),
     *     @OA\Parameter(name="offset", in="query", @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Success")
     * )
     */
    public function getFromNet(Request $request): JsonResponse
    {
        $limit  = (int)$request->query('limit', (int)env('PAGINATION_LIMIT', 5000));
        $offset = (int)$request->query('offset', 0);

        $posts = $this->wpPostService->fetchPage2('net', $limit, $offset);
        return response()->json(['success' => true, 'count' => count($posts), 'data' => $posts]);
    }
}
