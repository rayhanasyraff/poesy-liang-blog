<?php
namespace App\Controllers;

use App\Database;
use App\Helpers;

/**
 * Likes are persisted using the like_count column on the blogs table.
 */
class LikeController
{
    public static function get(array $params): void
    {
        $db     = Database::get();
        $blogId = (int)$params['id'];

        $stmt = $db->prepare('SELECT like_count FROM blogs WHERE id = ?');
        $stmt->bind_param('i', $blogId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$row) Helpers::notFound('Blog not found');
        Helpers::sendJson(['success' => true, 'likes' => (int)$row['like_count']]);
    }

    public static function add(array $params): void
    {
        $db     = Database::get();
        $blogId = (int)$params['id'];

        $stmt = $db->prepare('UPDATE blogs SET like_count = like_count + 1 WHERE id = ?');
        $stmt->bind_param('i', $blogId);
        $stmt->execute();
        $affected = $stmt->affected_rows;
        $stmt->close();

        if ($affected === 0) Helpers::notFound('Blog not found');

        $stmt2 = $db->prepare('SELECT like_count FROM blogs WHERE id = ?');
        $stmt2->bind_param('i', $blogId);
        $stmt2->execute();
        $row = $stmt2->get_result()->fetch_assoc();
        $stmt2->close();

        Helpers::sendJson(['success' => true, 'likes' => (int)($row['like_count'] ?? 0)]);
    }

    public static function remove(array $params): void
    {
        $db     = Database::get();
        $blogId = (int)$params['id'];

        $stmt = $db->prepare(
            'UPDATE blogs SET like_count = GREATEST(0, like_count - 1) WHERE id = ?'
        );
        $stmt->bind_param('i', $blogId);
        $stmt->execute();
        $affected = $stmt->affected_rows;
        $stmt->close();

        if ($affected === 0) Helpers::notFound('Blog not found');

        $stmt2 = $db->prepare('SELECT like_count FROM blogs WHERE id = ?');
        $stmt2->bind_param('i', $blogId);
        $stmt2->execute();
        $row = $stmt2->get_result()->fetch_assoc();
        $stmt2->close();

        Helpers::sendJson(['success' => true, 'likes' => (int)($row['like_count'] ?? 0)]);
    }
}
