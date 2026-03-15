<?php
namespace App\Controllers;

use App\Database;
use App\Helpers;
use App\Services\VersioningService;

class BlogVersionController
{
    private static function versioning(): VersioningService
    {
        return new VersioningService(Database::get());
    }

    // GET /blogs/{id}/versions
    public static function list(array $params): void
    {
        $db     = Database::get();
        $blogId = (int)$params['id'];
        $limit  = isset($_GET['limit'])  ? (int)$_GET['limit']  : 100;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

        $whereParts = ['blog_id = ?'];
        $types      = 'i';
        $values     = [$blogId];

        $filterable = [
            'parent_version_id' => 'i', 'version_number' => 'i', 'blog_title' => 's',
            'blog_excerpt' => 's', 'blog_content' => 's', 'tags' => 's',
            'commit_message' => 's', 'status' => 's', 'created_by' => 'i',
            'created_at' => 's', 'blog_visibility' => 's', 'comment_status' => 's',
            'like_visibility' => 's', 'view_visibility' => 's',
            'like_count' => 'i', 'view_count' => 'i',
        ];

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

        $where = ' WHERE ' . implode(' AND ', $whereParts);

        $countStmt = $db->prepare('SELECT COUNT(*) AS total FROM blog_versions' . $where);
        if (!$countStmt) throw new \RuntimeException($db->error);
        Helpers::bindParams($countStmt, $types, $values);
        $countStmt->execute();
        $total = (int)$countStmt->get_result()->fetch_assoc()['total'];
        $countStmt->close();

        $stmt = $db->prepare(
            'SELECT * FROM blog_versions' . $where . ' ORDER BY version_number DESC LIMIT ? OFFSET ?'
        );
        if (!$stmt) throw new \RuntimeException($db->error);
        Helpers::bindParams($stmt, $types . 'ii', array_merge($values, [$limit, $offset]));
        $stmt->execute();
        $res  = $stmt->get_result();
        $rows = [];
        while ($r = $res->fetch_assoc()) $rows[] = $r;
        $stmt->close();

        Helpers::sendJson([
            'success'       => true,
            'blog_id'       => $blogId,
            'total_rows'    => $total,
            'returned_rows' => count($rows),
            'limit'         => $limit,
            'offset'        => $offset,
            'data'          => $rows,
        ]);
    }

    // GET /blogs/{id}/versions/{verId}
    public static function get(array $params): void
    {
        $db        = Database::get();
        $blogId    = (int)$params['id'];
        $versionId = (int)$params['verId'];

        $stmt = $db->prepare('SELECT * FROM blog_versions WHERE id = ? AND blog_id = ?');
        $stmt->bind_param('ii', $versionId, $blogId);
        $stmt->execute();
        $res = $stmt->get_result();
        if ($res->num_rows === 0) Helpers::notFound('Version not found');
        $row = $res->fetch_assoc();
        $stmt->close();

        Helpers::sendJson(['success' => true, 'data' => $row]);
    }

    // POST /blogs/{id}/versions/draft
    public static function saveDraft(array $params): void
    {
        $blogId = (int)$params['id'];
        $body   = Helpers::getRequestBody();

        if (empty($body['blog_title']) && empty($body['blog_content'])) {
            Helpers::badRequest('blog_title or blog_content is required');
        }

        $result = self::versioning()->saveDraft($blogId, [
            'blog_title'      => $body['blog_title']      ?? 'Untitled',
            'blog_content'    => $body['blog_content']    ?? '',
            'blog_excerpt'    => $body['blog_excerpt']    ?? '',
            'tags'            => $body['tags']            ?? null,
            'blog_visibility' => $body['blog_visibility'] ?? null,
            'comment_status'  => $body['comment_status']  ?? null,
            'like_visibility' => $body['like_visibility'] ?? null,
            'view_visibility' => $body['view_visibility'] ?? null,
        ]);

        Helpers::sendJson(['success' => true, 'data' => $result]);
    }

    // POST /blogs/{id}/versions/publish
    public static function publishDraft(array $params): void
    {
        $blogId = (int)$params['id'];
        $body   = Helpers::getRequestBody();

        $result = self::versioning()->publishDraft($blogId, [
            'blog_title'      => $body['blog_title']      ?? 'Untitled',
            'blog_content'    => $body['blog_content']    ?? '',
            'blog_excerpt'    => $body['blog_excerpt']    ?? '',
            'tags'            => $body['tags']            ?? null,
            'blog_visibility' => $body['blog_visibility'] ?? null,
            'comment_status'  => $body['comment_status']  ?? null,
            'like_visibility' => $body['like_visibility'] ?? null,
            'view_visibility' => $body['view_visibility'] ?? null,
        ]);

        Helpers::sendJson(['success' => true, 'data' => $result]);
    }

    // POST /blogs/{id}/versions/{verId}/publish
    public static function publishVersion(array $params): void
    {
        $blogId    = (int)$params['id'];
        $versionId = (int)$params['verId'];

        self::versioning()->publishSpecificVersion($blogId, $versionId);
        Helpers::sendJson(['success' => true]);
    }

    // POST /blogs/{id}/versions/{verId}/revert
    public static function revert(array $params): void
    {
        $blogId    = (int)$params['id'];
        $versionId = (int)$params['verId'];

        $result = self::versioning()->revertToVersion($blogId, $versionId);
        Helpers::sendJson(['success' => true, 'data' => $result]);
    }

    // PATCH /blogs/{id}/settings
    public static function updateSettings(array $params): void
    {
        $blogId   = (int)$params['id'];
        $settings = Helpers::getRequestBody();

        self::versioning()->updateSettings($blogId, $settings);
        Helpers::sendJson(['success' => true]);
    }

    // POST /blogs/{id}/unpublish
    public static function unpublish(array $params): void
    {
        $blogId = (int)$params['id'];
        self::versioning()->unpublishBlog($blogId);
        Helpers::sendJson(['success' => true]);
    }
}
