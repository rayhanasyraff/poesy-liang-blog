<?php
namespace App\Controllers;

use App\Database;
use App\Helpers;

class UserController
{
    private static function db(): \mysqli { return Database::get(); }

    public static function list(): void
    {
        $db     = self::db();
        $limit  = isset($_GET['limit'])  ? (int)$_GET['limit']  : 50;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

        $filterable = [
            'ID' => 'i', 'user_login' => 's', 'user_nicename' => 's',
            'user_email' => 's', 'user_url' => 's', 'user_status' => 'i',
            'display_name' => 's',
        ];

        $whereParts = []; $types = ''; $values = [];
        foreach ($filterable as $col => $t) {
            if (!isset($_GET[$col]) || $_GET[$col] === '') continue;
            $val = $_GET[$col];
            if ($t === 's' && (strpos($val, '%') !== false || strpos($val, '*') !== false)) {
                $val = str_replace('*', '%', $val);
                $whereParts[] = "$col LIKE ?";
            } else {
                $whereParts[] = "$col = ?";
            }
            $types   .= $t;
            $values[] = $t === 'i' ? (int)$val : $val;
        }

        $where = $whereParts ? ' WHERE ' . implode(' AND ', $whereParts) : '';

        $countStmt = $db->prepare('SELECT COUNT(*) AS total FROM wp_users' . $where);
        if (!$countStmt) throw new \RuntimeException($db->error);
        if ($types !== '') Helpers::bindParams($countStmt, $types, $values);
        $countStmt->execute();
        $total = (int)$countStmt->get_result()->fetch_assoc()['total'];
        $countStmt->close();

        $selectSql = 'SELECT ID, user_login, user_nicename, user_email, user_url,
                             user_registered, user_activation_key, user_status, display_name
                      FROM wp_users' . $where . ' ORDER BY ID ASC LIMIT ? OFFSET ?';
        $stmt = $db->prepare($selectSql);
        if (!$stmt) throw new \RuntimeException($db->error);
        Helpers::bindParams($stmt, $types . 'ii', array_merge($values, [$limit, $offset]));
        $stmt->execute();
        $res  = $stmt->get_result();
        $rows = [];
        while ($r = $res->fetch_assoc()) $rows[] = $r;
        $stmt->close();

        Helpers::sendJson([
            'success'       => true,
            'total_rows'    => $total,
            'returned_rows' => count($rows),
            'limit'         => $limit,
            'offset'        => $offset,
            'data'          => $rows,
        ]);
    }

    public static function get(array $params): void
    {
        $db     = self::db();
        $userId = (int)$params['id'];
        $stmt   = $db->prepare(
            'SELECT ID, user_login, user_nicename, user_email, user_url,
                    user_registered, user_activation_key, user_status, display_name
             FROM wp_users WHERE ID = ?'
        );
        $stmt->bind_param('i', $userId);
        $stmt->execute();
        $res = $stmt->get_result();
        if ($res->num_rows === 0) Helpers::notFound('User not found');
        $row = $res->fetch_assoc();
        $stmt->close();
        Helpers::sendJson(['success' => true, 'data' => $row]);
    }

    public static function create(): void
    {
        $db   = self::db();
        $data = Helpers::getRequestBody();

        $user_login = $data['user_login'] ?? null;
        $user_email = $data['user_email'] ?? null;
        if (!$user_login || !$user_email) Helpers::badRequest('user_login and user_email are required');

        $user_pass           = $data['user_pass']           ?? '';
        $user_nicename       = $data['user_nicename']       ?? $user_login;
        $user_url            = $data['user_url']            ?? '';
        $user_registered     = $data['user_registered']     ?? Helpers::now();
        $user_activation_key = $data['user_activation_key'] ?? '';
        $user_status         = isset($data['user_status'])  ? (int)$data['user_status'] : 0;
        $display_name        = $data['display_name']        ?? $user_login;

        $stmt = $db->prepare(
            'INSERT INTO wp_users (user_login, user_pass, user_nicename, user_email, user_url,
             user_registered, user_activation_key, user_status, display_name)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->bind_param(
            'sssssssis',
            $user_login, $user_pass, $user_nicename, $user_email, $user_url,
            $user_registered, $user_activation_key, $user_status, $display_name
        );
        if (!$stmt->execute()) throw new \RuntimeException('Insert failed: ' . $stmt->error);
        $id = $stmt->insert_id;
        $stmt->close();

        Helpers::sendJson(['success' => true, 'id' => $id], 201);
    }

    public static function update(array $params): void
    {
        $db     = self::db();
        $userId = (int)$params['id'];
        $data   = Helpers::getRequestBody();

        $allowed  = ['user_login', 'user_pass', 'user_nicename', 'user_email', 'user_url',
                      'user_registered', 'user_activation_key', 'user_status', 'display_name'];
        $setParts = []; $types = ''; $values = [];

        foreach ($allowed as $f) {
            if (!array_key_exists($f, $data)) continue;
            $setParts[] = "$f = ?";
            $values[]   = $data[$f];
            $types     .= $f === 'user_status' ? 'i' : 's';
        }

        if (empty($setParts)) Helpers::badRequest('No updatable fields provided');

        $types   .= 'i';
        $values[] = $userId;
        $stmt     = $db->prepare('UPDATE wp_users SET ' . implode(', ', $setParts) . ' WHERE ID = ?');
        if (!$stmt) throw new \RuntimeException($db->error);
        Helpers::bindParams($stmt, $types, $values);
        if (!$stmt->execute()) throw new \RuntimeException('Update failed: ' . $stmt->error);
        $affected = $stmt->affected_rows;
        $stmt->close();

        Helpers::sendJson(['success' => true, 'affected' => $affected]);
    }

    public static function delete(array $params): void
    {
        $db     = self::db();
        $userId = (int)$params['id'];
        $stmt   = $db->prepare('DELETE FROM wp_users WHERE ID = ?');
        $stmt->bind_param('i', $userId);
        $stmt->execute();
        $affected = $stmt->affected_rows;
        $stmt->close();
        Helpers::sendJson(['success' => true, 'deleted' => $affected]);
    }
}
