<?php
namespace App;

class Helpers
{
    public static function sendJson($payload, int $code = 200): void
    {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function badRequest(string $msg): void
    {
        self::sendJson(['success' => false, 'error' => $msg], 400);
    }

    public static function notFound(string $msg = 'Not found'): void
    {
        self::sendJson(['success' => false, 'error' => $msg], 404);
    }

    public static function serverError(string $msg = 'Internal server error'): void
    {
        self::sendJson(['success' => false, 'error' => $msg], 500);
    }

    public static function getRequestBody(): array
    {
        $input = file_get_contents('php://input');
        if (empty($input)) return [];
        $data = json_decode($input, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            self::badRequest('Invalid JSON input');
        }
        return $data ?? [];
    }

    /**
     * Bind parameters to a prepared statement using a reference-based approach
     * compatible with call_user_func_array.
     */
    public static function bindParams(\mysqli_stmt $stmt, string $types, array $values): void
    {
        $bind = array_merge([$types], $values);
        $refs = [];
        foreach ($bind as $k => $v) {
            $refs[$k] = &$bind[$k];
        }
        call_user_func_array([$stmt, 'bind_param'], $refs);
    }

    public static function now(): string
    {
        return date('Y-m-d H:i:s');
    }

    public static function nowGmt(): string
    {
        return gmdate('Y-m-d H:i:s');
    }
}
