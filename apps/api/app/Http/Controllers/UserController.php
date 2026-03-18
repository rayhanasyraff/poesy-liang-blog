<?php

namespace App\Http\Controllers;

use App\Models\WpUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @OA\Tag(name="Users", description="WordPress user management")
 */
class UserController extends Controller
{
    private array $publicFields = [
        'ID', 'user_login', 'user_nicename', 'user_email', 'user_url',
        'user_registered', 'user_activation_key', 'user_status', 'display_name',
    ];

    /**
     * @OA\Get(
     *     path="/users",
     *     tags={"Users"},
     *     summary="List all users",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="limit", in="query", @OA\Schema(type="integer", default=50)),
     *     @OA\Parameter(name="offset", in="query", @OA\Schema(type="integer", default=0)),
     *     @OA\Response(response=200, description="Success")
     * )
     */
    public function index(Request $request): JsonResponse
    {
        $limit  = (int)$request->query('limit', 50);
        $offset = (int)$request->query('offset', 0);

        $filterable = ['ID', 'user_login', 'user_nicename', 'user_email', 'user_url', 'user_status', 'display_name'];
        $query = WpUser::select($this->publicFields);

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
        $rows  = $query->orderBy('ID')->limit($limit)->offset($offset)->get();

        return response()->json([
            'success'       => true,
            'total_rows'    => $total,
            'returned_rows' => $rows->count(),
            'limit'         => $limit,
            'offset'        => $offset,
            'data'          => $rows,
        ]);
    }

    /**
     * @OA\Get(
     *     path="/users/{id}",
     *     tags={"Users"},
     *     summary="Get user by ID",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Success"),
     *     @OA\Response(response=404, description="Not found")
     * )
     */
    public function show(int $id): JsonResponse
    {
        $user = WpUser::select($this->publicFields)->find($id);
        if (!$user) {
            return response()->json(['success' => false, 'error' => 'User not found'], 404);
        }
        return response()->json(['success' => true, 'data' => $user]);
    }

    /**
     * @OA\Post(
     *     path="/users",
     *     tags={"Users"},
     *     summary="Create a new user",
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(response=201, description="Created")
     * )
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'user_login' => 'required|string',
            'user_email' => 'required|string',
        ]);

        $data = $request->all();

        $user = WpUser::create([
            'user_login'          => $data['user_login'],
            'user_pass'           => $data['user_pass']           ?? '',
            'user_nicename'       => $data['user_nicename']       ?? $data['user_login'],
            'user_email'          => $data['user_email'],
            'user_url'            => $data['user_url']            ?? '',
            'user_registered'     => $data['user_registered']     ?? now()->toDateTimeString(),
            'user_activation_key' => $data['user_activation_key'] ?? '',
            'user_status'         => isset($data['user_status'])  ? (int)$data['user_status'] : 0,
            'display_name'        => $data['display_name']        ?? $data['user_login'],
        ]);

        return response()->json(['success' => true, 'id' => $user->ID], 201);
    }

    /**
     * @OA\Put(
     *     path="/users/{id}",
     *     tags={"Users"},
     *     summary="Update a user (full or partial)",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Success")
     * )
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $allowed = ['user_login', 'user_pass', 'user_nicename', 'user_email', 'user_url',
                    'user_registered', 'user_activation_key', 'user_status', 'display_name'];

        $update = array_intersect_key($request->all(), array_flip($allowed));

        if (empty($update)) {
            return response()->json(['success' => false, 'error' => 'No updatable fields provided'], 400);
        }

        $affected = WpUser::where('ID', $id)->update($update);
        return response()->json(['success' => true, 'affected' => $affected]);
    }

    /**
     * @OA\Delete(
     *     path="/users/{id}",
     *     tags={"Users"},
     *     summary="Delete a user",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Success")
     * )
     */
    public function destroy(int $id): JsonResponse
    {
        $deleted = WpUser::where('ID', $id)->delete();
        return response()->json(['success' => true, 'deleted' => $deleted]);
    }
}
