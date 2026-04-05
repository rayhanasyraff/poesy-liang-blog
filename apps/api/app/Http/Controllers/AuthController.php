<?php

namespace App\Http\Controllers;

use App\Models\WpUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Tymon\JWTAuth\Facades\JWTAuth;

/**
 * @OA\Tag(name="Auth", description="Authentication endpoints")
 */
class AuthController extends Controller
{
    /**
     * @OA\Post(
     *     path="/auth/login",
     *     tags={"Auth"},
     *     summary="Login with WordPress credentials",
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"email","password"},
     *             @OA\Property(property="email", type="string", format="email"),
     *             @OA\Property(property="password", type="string")
     *         )
     *     ),
     *     @OA\Response(response=200, description="Login successful"),
     *     @OA\Response(response=401, description="Invalid credentials"),
     *     @OA\Response(response=403, description="Access denied")
     * )
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|string',
            'password' => 'required|string',
        ]);

        $email    = trim($request->input('email'));
        $password = $request->input('password');

        $user = WpUser::where('user_email', $email)->first();

        if (!$user) {
            return response()->json(['success' => false, 'error' => 'Invalid email or password'], 401);
        }

        if (!$this->checkPassword($password, $user->user_pass)) {
            return response()->json(['success' => false, 'error' => 'Invalid email or password'], 401);
        }

        if ((int)$user->user_status !== 0) {
            return response()->json(['success' => false, 'error' => 'Access denied: not an admin account'], 403);
        }

        try {
            $token = JWTAuth::fromUser($user);
        } catch (\Exception $e) {
            Log::error('JWT generation failed: ' . $e->getMessage());
            return response()->json(['success' => false, 'error' => 'Token generation failed'], 500);
        }

        return response()->json([
            'success' => true,
            'token'   => $token,
            'data'    => [
                'ID'           => $user->ID,
                'user_login'   => $user->user_login,
                'user_email'   => $user->user_email,
                'display_name' => $user->display_name,
            ],
        ]);
    }

    /**
     * WordPress phpass-compatible password check.
     * Supports: phpass ($P$), MD5 fallback.
     */
    private function checkPassword(string $password, string $hash): bool
    {
        if (str_starts_with($hash, '$P$') || str_starts_with($hash, '$H$')) {
            return $this->phpassCheck($password, $hash);
        }
        // Legacy MD5
        if (strlen($hash) === 32 && ctype_xdigit($hash)) {
            return md5($password) === $hash;
        }
        return false;
    }

    private function phpassCheck(string $password, string $hash): bool
    {
        $itoa64 = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        if (strlen($hash) !== 34) return false;

        $count_log2 = strpos($itoa64, $hash[3]);
        if ($count_log2 < 7 || $count_log2 > 30) return false;

        $count = 1 << $count_log2;
        $salt  = substr($hash, 4, 8);
        if (strlen($salt) !== 8) return false;

        $checksum = md5($salt . $password, true);
        do {
            $checksum = md5($checksum . $password, true);
        } while (--$count);

        $output = $this->encode64($checksum, 16, $itoa64);
        return substr($hash, 12) === $output;
    }

    private function encode64(string $input, int $count, string $itoa64): string
    {
        $output = '';
        $i = 0;
        do {
            $value = ord($input[$i++]);
            $output .= $itoa64[$value & 0x3f];
            if ($i < $count) $value |= ord($input[$i]) << 8;
            $output .= $itoa64[($value >> 6) & 0x3f];
            if ($i++ >= $count) break;
            if ($i < $count) $value |= ord($input[$i]) << 16;
            $output .= $itoa64[($value >> 12) & 0x3f];
            if ($i++ >= $count) break;
            $output .= $itoa64[($value >> 18) & 0x3f];
        } while ($i < $count);
        return $output;
    }
}
