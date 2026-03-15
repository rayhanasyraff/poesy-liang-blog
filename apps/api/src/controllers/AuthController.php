<?php
namespace App\Controllers;

use App\Auth;
use App\Database;
use App\Helpers;

class AuthController
{
    public static function login(): void
    {
        $body     = Helpers::getRequestBody();
        $email    = trim($body['email'] ?? '');
        $password = $body['password'] ?? '';

        if (!$email || !$password) {
            Helpers::badRequest('email and password are required');
        }

        $db   = Database::get();
        $stmt = $db->prepare(
            'SELECT ID, user_login, user_pass, user_email, display_name, user_status
             FROM wp_users WHERE user_email = ? LIMIT 1'
        );
        $stmt->bind_param('s', $email);
        $stmt->execute();
        $res = $stmt->get_result();

        if ($res->num_rows === 0) {
            Helpers::sendJson(['success' => false, 'error' => 'Invalid email or password'], 401);
        }

        $user = $res->fetch_assoc();
        $stmt->close();

        if (!Auth::checkPassword($password, $user['user_pass'])) {
            Helpers::sendJson(['success' => false, 'error' => 'Invalid email or password'], 401);
        }

        if ((int)$user['user_status'] !== 0) {
            Helpers::sendJson(['success' => false, 'error' => 'Access denied: not an admin account'], 403);
        }

        unset($user['user_pass']);
        Helpers::sendJson(['success' => true, 'data' => $user]);
    }
}
