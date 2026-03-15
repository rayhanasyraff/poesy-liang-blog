<?php
namespace App;

class Database
{
    private static $instance = null;

    public static function get(): \mysqli
    {
        if (self::$instance !== null) {
            return self::$instance;
        }

        $cfg = Config::get();
        $conn = new \mysqli($cfg['db_host'], $cfg['db_user'], $cfg['db_pass'], $cfg['db_name']);

        if ($conn->connect_error) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Database connection failed']);
            error_log('DB connection failed: ' . $conn->connect_error);
            exit;
        }

        $conn->set_charset('utf8mb4');
        self::$instance = $conn;
        return $conn;
    }
}
