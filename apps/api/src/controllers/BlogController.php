<?php
namespace App\Controllers;

use App\Database;
use App\Helpers;
use App\Services\VersioningService;

class BlogController
{
    private static string $selectCols = 'id, blog_name, blog_title, blog_excerpt,
        blog_date_published, blog_date_published_gmt, blog_content, blog_status,
        comment_status, notification_status, blog_date_modified, blog_date_modified_gmt,
        tags, blog_visibility, like_count, blog_date_created, blog_date_created_gmt,
        like_visibility, view_count, view_visibility, blog_version';

    private static function db(): \mysqli  { return Database::get(); }

    private static function versioning(): VersioningService
    {
        return new VersioningService(Database::get());
    }

    // ── GET /blogs ────────────────────────────────────────────────────────────

    public static function getAll(): void
    {
        $db     = self::db();
        $cfg    = \App\Config::get();
        $limit  = isset($_GET['limit'])  ? (int)$_GET['limit']  : $cfg['pagination_limit'];
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

        $blog_status     = $_GET['blog_status']     ?? null;
        $blog_visibility = $_GET['blog_visibility'] ?? null;
        $includeVersions = ($_GET['include_versions'] ?? '') === 'true';

        // Build WHERE clause
        $filterable = [
            'id' => 'i', 'blog_name' => 's', 'blog_title' => 's', 'blog_excerpt' => 's',
            'blog_date_published' => 's', 'blog_date_published_gmt' => 's',
            'blog_content' => 's', 'blog_status' => 's', 'comment_status' => 's',
            'notification_status' => 's', 'blog_date_modified' => 's',
            'blog_date_modified_gmt' => 's', 'tags' => 's', 'blog_visibility' => 's',
            'like_count' => 'i', 'blog_date_created' => 's', 'blog_date_created_gmt' => 's',
            'like_visibility' => 's', 'view_count' => 'i', 'view_visibility' => 's',
            'blog_version' => 'i',
        ];

        $whereParts = []; $types = ''; $values = [];

        // Handle combined blog_status + blog_visibility filtering (fetch all, filter in PHP)
        // to replicate the TS fetchBlogs behaviour with "published"/"publish" normalization.
        $needsPhpFilter = $blog_status !== null && $blog_visibility !== null;

        if (!$needsPhpFilter) {
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
        } else {
            // When filtering by both status and visibility, use a DB filter but treat
            // "published" and "publish" as equivalent by using IN(?,?)
            $statusLower = strtolower($blog_status);
            if ($statusLower === 'published' || $statusLower === 'publish') {
                $whereParts[] = "blog_status IN ('published', 'publish')";
            } else {
                $whereParts[] = 'blog_status = ?';
                $types   .= 's';
                $values[] = $blog_status;
            }
            $whereParts[] = 'blog_visibility = ?';
            $types   .= 's';
            $values[] = $blog_visibility;
        }

        $where = $whereParts ? ' WHERE ' . implode(' AND ', $whereParts) : '';

        // Count
        $countStmt = $db->prepare('SELECT COUNT(*) AS total FROM blogs' . $where);
        if (!$countStmt) throw new \RuntimeException($db->error);
        if ($types !== '') Helpers::bindParams($countStmt, $types, $values);
        $countStmt->execute();
        $total = (int)$countStmt->get_result()->fetch_assoc()['total'];
        $countStmt->close();

        // Select
        $selectSql = 'SELECT ' . self::$selectCols . ' FROM blogs' . $where
                   . ' ORDER BY id DESC LIMIT ? OFFSET ?';
        $stmt = $db->prepare($selectSql);
        if (!$stmt) throw new \RuntimeException($db->error);
        Helpers::bindParams($stmt, $types . 'ii', array_merge($values, [$limit, $offset]));
        $stmt->execute();
        $res   = $stmt->get_result();
        $blogs = [];
        while ($r = $res->fetch_assoc()) $blogs[] = $r;
        $stmt->close();

        $nextOffset = count($blogs) === $limit ? $offset + $limit : null;

        if (!$includeVersions) {
            Helpers::sendJson([
                'success'    => true,
                'count'      => count($blogs),
                'nextOffset' => $nextOffset,
                'data'       => $blogs,
            ]);
        }

        // include_versions=true: merge latest version data onto each blog
        $ids          = array_filter(array_column($blogs, 'id'));
        $versionSvc   = self::versioning();
        $versionStatus = $_GET['version_status'] ?? null;

        if ($versionStatus !== null) {
            // Single-status fetch (e.g. public page uses 'committed')
            $versionMap = $versionSvc->getLatestVersionsForBlogs($ids, $versionStatus);
            $data = array_map(function ($blog) use ($versionMap) {
                $v = $versionMap[(int)$blog['id']] ?? null;
                return array_merge($blog, [
                    'latest_version_id'      => $v['id']              ?? null,
                    'latest_version_number'  => $v['version_number']  ?? null,
                    'latest_version_status'  => $v['status']          ?? null,
                    'latest_blog_title'      => $v['blog_title']      ?? null,
                    'latest_blog_excerpt'    => $v['blog_excerpt']     ?? null,
                    'latest_blog_content'    => $v['blog_content']     ?? null,
                    'latest_tags'            => $v['tags']             ?? null,
                    'latest_draft_saved_at'  => $v['draft_saved_at']  ?? null,
                    'latest_published_at'    => $v['published_at']     ?? null,
                ]);
            }, $blogs);
        } else {
            // Admin path: fetch draft and committed in parallel (sequential in PHP)
            $draftMap     = $versionSvc->getLatestVersionsForBlogs($ids, 'draft');
            $committedMap = $versionSvc->getLatestVersionsForBlogs($ids, 'committed');

            $data = array_map(function ($blog) use ($draftMap, $committedMap) {
                $bid = (int)$blog['id'];
                $d   = $draftMap[$bid]     ?? null;
                $c   = $committedMap[$bid] ?? null;
                return array_merge($blog, [
                    // Draft fields
                    'latest_draft_version_id'       => $d['id']             ?? null,
                    'latest_draft_version_number'   => $d['version_number'] ?? null,
                    'latest_draft_blog_title'       => $d['blog_title']     ?? null,
                    // Committed fields
                    'latest_committed_version_id'     => $c['id']              ?? null,
                    'latest_committed_version_number' => $c['version_number']  ?? null,
                    'latest_committed_blog_title'     => $c['blog_title']      ?? null,
                    'latest_committed_published_at'   => $c['published_at']    ?? null,
                    // Legacy compat
                    'latest_version_id'      => $d['id']             ?? $c['id']             ?? null,
                    'latest_version_number'  => $d['version_number'] ?? $c['version_number'] ?? null,
                    'latest_version_status'  => $d ? 'draft' : ($c ? 'committed' : null),
                    'latest_blog_title'      => $d['blog_title']  ?? $c['blog_title']  ?? null,
                    'latest_blog_excerpt'    => $d['blog_excerpt'] ?? $c['blog_excerpt'] ?? null,
                    'latest_blog_content'    => $d['blog_content'] ?? $c['blog_content'] ?? null,
                    'latest_tags'            => $d['tags']         ?? $c['tags']         ?? null,
                    'latest_draft_saved_at'  => $d['draft_saved_at'] ?? null,
                    'latest_published_at'    => $c['published_at']   ?? null,
                ]);
            }, $blogs);
        }

        Helpers::sendJson([
            'success'    => true,
            'count'      => count($data),
            'nextOffset' => $nextOffset,
            'data'       => $data,
        ]);
    }

    // ── GET /blogs/{id} ───────────────────────────────────────────────────────

    public static function getById(array $params): void
    {
        $db     = self::db();
        $blogId = (int)$params['id'];

        $stmt = $db->prepare('SELECT ' . self::$selectCols . ' FROM blogs WHERE id = ?');
        if (!$stmt) throw new \RuntimeException($db->error);
        $stmt->bind_param('i', $blogId);
        $stmt->execute();
        $res = $stmt->get_result();
        if ($res->num_rows === 0) Helpers::notFound('Blog not found');
        $row = $res->fetch_assoc();
        $stmt->close();

        Helpers::sendJson(['success' => true, 'data' => $row]);
    }

    // ── POST /blogs ───────────────────────────────────────────────────────────

    public static function create(): void
    {
        $db   = self::db();
        $data = Helpers::getRequestBody();

        $blog_name  = $data['blog_name']  ?? null;
        $blog_title = $data['blog_title'] ?? null;
        if (!$blog_name || !$blog_title) Helpers::badRequest('blog_name and blog_title are required');

        $blog_excerpt        = $data['blog_excerpt']        ?? '';
        $blog_content        = $data['blog_content']        ?? '';
        $blog_status         = in_array($data['blog_status'] ?? '', ['draft','publish','published'])
                               ? $data['blog_status'] : 'draft';
        $comment_status      = $data['comment_status']      ?? 'close';
        $notification_status = $data['notification_status'] ?? 'none';
        $now                 = Helpers::now();
        $nowGmt              = Helpers::nowGmt();
        $tags                = $data['tags']                ?? null;
        $blog_visibility     = $data['blog_visibility']     ?? 'private';
        $like_count          = (int)($data['like_count']    ?? 0);
        $like_visibility     = $data['like_visibility']     ?? 'close';
        $view_count          = (int)($data['view_count']    ?? 0);
        $view_visibility     = $data['view_visibility']     ?? 'open';
        $blog_version        = (int)($data['blog_version']  ?? 1);

        $stmt = $db->prepare(
            'INSERT INTO blogs (blog_name, blog_title, blog_excerpt, blog_content, blog_status,
             comment_status, notification_status, blog_date_created, blog_date_created_gmt,
             tags, blog_visibility, like_count, like_visibility, view_count, view_visibility, blog_version)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        if (!$stmt) throw new \RuntimeException('Prepare failed: ' . $db->error);
        $stmt->bind_param(
            'sssssssssssisisi',
            $blog_name, $blog_title, $blog_excerpt, $blog_content, $blog_status,
            $comment_status, $notification_status, $now, $nowGmt,
            $tags, $blog_visibility, $like_count, $like_visibility,
            $view_count, $view_visibility, $blog_version
        );
        if (!$stmt->execute()) throw new \RuntimeException('Insert failed: ' . $stmt->error);
        $blogId = $stmt->insert_id;
        $stmt->close();

        // Automatically create v1 draft version
        try {
            self::versioning()->saveDraft($blogId, [
                'blog_title'      => $blog_title,
                'blog_content'    => $blog_content,
                'blog_excerpt'    => $blog_excerpt,
                'tags'            => $tags,
                'blog_visibility' => $blog_visibility !== 'private' ? $blog_visibility : 'public',
                'comment_status'  => $comment_status,
                'like_visibility' => $like_visibility,
                'view_visibility' => $view_visibility,
            ]);
        } catch (\Throwable $e) {
            error_log("Warning: blog $blogId created but failed to create v1 draft: " . $e->getMessage());
        }

        Helpers::sendJson(['success' => true, 'data' => ['id' => $blogId]], 201);
    }

    // ── DELETE /blogs/{id} ────────────────────────────────────────────────────

    public static function delete(array $params): void
    {
        $db     = self::db();
        $blogId = (int)$params['id'];

        $stmt = $db->prepare('DELETE FROM blogs WHERE id = ?');
        $stmt->bind_param('i', $blogId);
        $stmt->execute();
        $affected = $stmt->affected_rows;
        $stmt->close();

        Helpers::sendJson(['success' => true, 'deleted' => $affected > 0]);
    }

    // ── GET /blogs/check-slug ─────────────────────────────────────────────────

    public static function checkSlug(): void
    {
        $db        = self::db();
        $slug      = isset($_GET['slug']) ? strtolower(trim($_GET['slug'])) : '';
        $excludeId = $_GET['exclude_id'] ?? null;

        if ($slug === '') Helpers::badRequest('slug is required');

        $stmt = $db->prepare(
            'SELECT id FROM blogs WHERE blog_name = ? LIMIT 5'
        );
        $stmt->bind_param('s', $slug);
        $stmt->execute();
        $res  = $stmt->get_result();
        $rows = [];
        while ($r = $res->fetch_assoc()) $rows[] = $r;
        $stmt->close();

        if ($excludeId !== null) {
            $rows = array_filter($rows, fn($r) => (string)$r['id'] !== (string)$excludeId);
        }

        Helpers::sendJson(['success' => true, 'available' => count($rows) === 0]);
    }
}
