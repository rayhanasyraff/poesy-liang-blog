<?php
namespace App\Services;

use App\Helpers;

/**
 * Handles the save-draft / publish / revert / unpublish workflow.
 * All operations are direct DB calls — no HTTP self-calls needed.
 */
class VersioningService
{
    private $db;

    public function __construct(\mysqli $db)
    {
        $this->db = $db;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function prepare(string $sql): \mysqli_stmt
    {
        $stmt = $this->db->prepare($sql);
        if (!$stmt) throw new \RuntimeException('Prepare failed: ' . $this->db->error);
        return $stmt;
    }

    private function nowLocal(): string
    {
        return date('Y-m-d H:i:s');
    }

    // ── Core queries ─────────────────────────────────────────────────────────

    public function getLatestVersion(int $blogId): ?array
    {
        $stmt = $this->prepare(
            'SELECT * FROM blog_versions WHERE blog_id = ? ORDER BY version_number DESC LIMIT 1'
        );
        $stmt->bind_param('i', $blogId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $row ?: null;
    }

    private function getVersionById(int $blogId, int $versionId): ?array
    {
        $stmt = $this->prepare(
            'SELECT * FROM blog_versions WHERE id = ? AND blog_id = ?'
        );
        $stmt->bind_param('ii', $versionId, $blogId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $row ?: null;
    }

    private function nextVersionNumber(int $blogId): int
    {
        $stmt = $this->prepare(
            'SELECT COALESCE(MAX(version_number), 0) AS maxv FROM blog_versions WHERE blog_id = ?'
        );
        $stmt->bind_param('i', $blogId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return (int)$row['maxv'] + 1;
    }

    private function insertVersion(int $blogId, array $data): array
    {
        $nextVer         = $this->nextVersionNumber($blogId);
        $blog_title      = $data['blog_title'] ?? '';
        $blog_excerpt    = $data['blog_excerpt'] ?? '';
        $blog_content    = $data['blog_content'] ?? '';
        $tags            = $data['tags'] ?? null;
        $commit_message  = $data['commit_message'] ?? null;
        $status          = in_array($data['status'] ?? '', ['draft', 'committed', 'published'])
                           ? $data['status'] : 'draft';
        $created_by      = (int)($data['created_by'] ?? 0);
        $created_at      = $data['created_at'] ?? $this->nowLocal();
        $blog_visibility = in_array($data['blog_visibility'] ?? '', ['public', 'private'])
                           ? $data['blog_visibility'] : 'public';
        $comment_status  = in_array($data['comment_status'] ?? '', ['open', 'close'])
                           ? $data['comment_status'] : 'open';
        $like_visibility = in_array($data['like_visibility'] ?? '', ['open', 'close'])
                           ? $data['like_visibility'] : 'open';
        $view_visibility = in_array($data['view_visibility'] ?? '', ['open', 'close'])
                           ? $data['view_visibility'] : 'open';
        $like_count      = (int)($data['like_count'] ?? 0);
        $view_count      = (int)($data['view_count'] ?? 0);
        $parent_version_id = isset($data['parent_version_id']) ? (int)$data['parent_version_id'] : null;
        $draft_saved_at  = $data['draft_saved_at'] ?? null;
        $published_at    = $data['published_at'] ?? null;

        if ($parent_version_id === null) {
            $stmt = $this->prepare(
                'INSERT INTO blog_versions (blog_id, parent_version_id, version_number, blog_title,
                 blog_excerpt, blog_content, tags, commit_message, status, created_by, created_at,
                 blog_visibility, comment_status, like_visibility, view_visibility, like_count,
                 view_count, draft_saved_at, published_at)
                 VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->bind_param(
                'iissssssisssssiiiss',
                $blogId, $nextVer, $blog_title, $blog_excerpt, $blog_content, $tags,
                $commit_message, $status, $created_by, $created_at,
                $blog_visibility, $comment_status, $like_visibility, $view_visibility,
                $like_count, $view_count, $draft_saved_at, $published_at
            );
        } else {
            $stmt = $this->prepare(
                'INSERT INTO blog_versions (blog_id, parent_version_id, version_number, blog_title,
                 blog_excerpt, blog_content, tags, commit_message, status, created_by, created_at,
                 blog_visibility, comment_status, like_visibility, view_visibility, like_count,
                 view_count, draft_saved_at, published_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->bind_param(
                'iiissssssisssssiiiss',
                $blogId, $parent_version_id, $nextVer, $blog_title, $blog_excerpt, $blog_content,
                $tags, $commit_message, $status, $created_by, $created_at,
                $blog_visibility, $comment_status, $like_visibility, $view_visibility,
                $like_count, $view_count, $draft_saved_at, $published_at
            );
        }

        if (!$stmt->execute()) throw new \RuntimeException('Insert version failed: ' . $stmt->error);
        $id = $stmt->insert_id;
        $stmt->close();

        return ['id' => $id, 'version_number' => $nextVer];
    }

    private function updateVersion(int $blogId, int $versionId, array $fields): void
    {
        $allowed = [
            'blog_title', 'blog_content', 'blog_excerpt', 'tags', 'commit_message',
            'status', 'draft_saved_at', 'published_at', 'blog_visibility', 'comment_status',
            'like_visibility', 'view_visibility', 'like_count', 'view_count',
        ];

        $setParts = [];
        $types    = '';
        $values   = [];

        foreach ($allowed as $f) {
            if (!array_key_exists($f, $fields)) continue;
            if ($f === 'status' && !in_array($fields[$f], ['draft', 'committed', 'published'])) continue;
            $setParts[] = "$f = ?";
            $values[]   = $fields[$f];
            $types     .= is_int($fields[$f]) ? 'i' : 's';
        }

        if (empty($setParts)) return;

        $types   .= 'ii';
        $values[] = $versionId;
        $values[] = $blogId;

        $stmt = $this->prepare(
            'UPDATE blog_versions SET ' . implode(', ', $setParts) . ' WHERE id = ? AND blog_id = ?'
        );
        Helpers::bindParams($stmt, $types, $values);
        if (!$stmt->execute()) throw new \RuntimeException('Update version failed: ' . $stmt->error);
        $stmt->close();
    }

    private function updateBlog(int $blogId, array $fields): void
    {
        $allowed = [
            'blog_name', 'blog_title', 'blog_excerpt', 'blog_content', 'blog_status',
            'comment_status', 'notification_status', 'tags', 'blog_visibility',
            'like_count', 'like_visibility', 'view_count', 'view_visibility',
            'blog_version', 'current_published_version_id',
            'blog_date_modified', 'blog_date_modified_gmt',
            'blog_date_published', 'blog_date_published_gmt',
        ];

        $setParts = [];
        $types    = '';
        $values   = [];

        foreach ($allowed as $f) {
            if (!array_key_exists($f, $fields)) continue;
            $val = $fields[$f];
            if ($val === null) {
                $setParts[] = "$f = NULL";
                continue;
            }
            $setParts[] = "$f = ?";
            $values[] = $val;
            $types   .= is_int($val) ? 'i' : 's';
        }

        // Separate NULL-literal parts from parameterised parts
        $nullParts  = [];
        $paramParts = [];
        foreach ($setParts as $p) {
            if (strpos($p, '= NULL') !== false) {
                $nullParts[] = $p;
            } else {
                $paramParts[] = $p;
            }
        }

        if (empty($paramParts) && empty($nullParts)) return;

        $allParts = array_merge(array_values($paramParts), array_values($nullParts));
        $types   .= 'i';
        $values[] = $blogId;

        $stmt = $this->prepare('UPDATE blogs SET ' . implode(', ', $allParts) . ' WHERE id = ?');
        Helpers::bindParams($stmt, $types, $values);
        if (!$stmt->execute()) throw new \RuntimeException('Update blog failed: ' . $stmt->error);
        $stmt->close();
    }

    // ── Public API ───────────────────────────────────────────────────────────

    /**
     * Save draft: update existing draft OR create new draft version.
     * Returns ['id' => int, 'version_number' => int]
     */
    public function saveDraft(int $blogId, array $data): array
    {
        $latest = $this->getLatestVersion($blogId);
        $now    = $this->nowLocal();

        if ($latest && $latest['status'] === 'draft') {
            $this->updateVersion($blogId, (int)$latest['id'], [
                'blog_title'      => $data['blog_title'],
                'blog_content'    => $data['blog_content'],
                'blog_excerpt'    => $data['blog_excerpt'] ?? '',
                'tags'            => $data['tags'] ?? null,
                'blog_visibility' => $data['blog_visibility'] ?? $latest['blog_visibility'],
                'comment_status'  => $data['comment_status']  ?? $latest['comment_status'],
                'like_visibility' => $data['like_visibility'] ?? $latest['like_visibility'],
                'view_visibility' => $data['view_visibility'] ?? $latest['view_visibility'],
                'draft_saved_at'  => $now,
            ]);
            return ['id' => (int)$latest['id'], 'version_number' => (int)$latest['version_number']];
        }

        return $this->insertVersion($blogId, array_merge([
            'status'         => 'draft',
            'draft_saved_at' => $now,
            'created_at'     => $now,
            'blog_visibility' => 'public',
            'comment_status'  => 'open',
            'like_visibility' => 'open',
            'view_visibility' => 'open',
        ], $data));
    }

    /**
     * Publish draft: saveDraft → mark committed → update blog row.
     * Returns ['published' => ['id' => int, 'version_number' => int]]
     */
    public function publishDraft(int $blogId, array $data): array
    {
        ['id' => $draftId, 'version_number' => $verNum] = $this->saveDraft($blogId, $data);
        $now = $this->nowLocal();

        $this->updateVersion($blogId, $draftId, [
            'status'       => 'committed',
            'published_at' => $now,
        ]);

        $this->updateBlog($blogId, [
            'blog_status'                  => 'published',
            'current_published_version_id' => $draftId,
            'blog_title'                   => $data['blog_title'],
            'blog_content'                 => $data['blog_content'],
            'blog_excerpt'                 => $data['blog_excerpt'] ?? '',
            'tags'                         => $data['tags'] ?? null,
            'blog_date_modified'           => $now,
            'blog_date_modified_gmt'       => $now,
        ]);

        return ['published' => ['id' => $draftId, 'version_number' => $verNum]];
    }

    /**
     * Publish a specific version by ID (from version history).
     */
    public function publishSpecificVersion(int $blogId, int $versionId): void
    {
        $ver = $this->getVersionById($blogId, $versionId);
        if (!$ver) throw new \RuntimeException("Version $versionId not found for blog $blogId");

        $now = $this->nowLocal();

        $this->updateVersion($blogId, $versionId, [
            'status'       => 'committed',
            'published_at' => $now,
        ]);

        $this->updateBlog($blogId, [
            'blog_status'                  => 'published',
            'current_published_version_id' => $versionId,
            'blog_title'                   => $ver['blog_title'],
            'blog_content'                 => $ver['blog_content'],
            'blog_excerpt'                 => $ver['blog_excerpt'] ?? '',
            'tags'                         => $ver['tags'] ?? null,
            'blog_date_modified'           => $now,
            'blog_date_modified_gmt'       => $now,
        ]);
    }

    /**
     * Revert to version: creates a new draft copied from the given version.
     * Returns ['id' => int, 'version_number' => int]
     */
    public function revertToVersion(int $blogId, int $versionId): array
    {
        $old = $this->getVersionById($blogId, $versionId);
        if (!$old) throw new \RuntimeException("Version $versionId not found for blog $blogId");

        $now = $this->nowLocal();

        return $this->insertVersion($blogId, [
            'blog_title'      => $old['blog_title'],
            'blog_content'    => $old['blog_content'],
            'blog_excerpt'    => $old['blog_excerpt'] ?? '',
            'tags'            => $old['tags'] ?? null,
            'status'          => 'draft',
            'draft_saved_at'  => $now,
            'blog_visibility' => $old['blog_visibility'] ?? 'public',
            'comment_status'  => $old['comment_status']  ?? 'open',
            'like_visibility' => $old['like_visibility']  ?? 'open',
            'view_visibility' => $old['view_visibility']  ?? 'open',
            'created_at'      => $now,
        ]);
    }

    /**
     * Update blog-level settings only (visibility, comments, etc.).
     */
    public function updateSettings(int $blogId, array $settings): void
    {
        $now = $this->nowLocal();
        $this->updateBlog($blogId, array_merge($settings, [
            'blog_date_modified'     => $now,
            'blog_date_modified_gmt' => $now,
        ]));
    }

    /**
     * Unpublish: set blog_status = 'draft', clear current_published_version_id.
     */
    public function unpublishBlog(int $blogId): void
    {
        $now = $this->nowLocal();
        $this->updateBlog($blogId, [
            'blog_status'                  => 'draft',
            'current_published_version_id' => null,
            'blog_date_modified'           => $now,
            'blog_date_modified_gmt'       => $now,
        ]);
    }

    /**
     * Get latest version(s) for an array of blog IDs, optionally filtered by status.
     * For status='committed', also includes legacy 'published' rows.
     * Returns ['blog_id' => row, ...]
     */
    public function getLatestVersionsForBlogs(array $blogIds, ?string $status = null): array
    {
        if (empty($blogIds)) return [];

        $ids          = array_values(array_map('intval', $blogIds));
        $placeholders = implode(',', array_fill(0, count($ids), '?'));

        if ($status === 'committed') {
            // Include legacy 'published' rows as well
            $sql = "SELECT bv.* FROM blog_versions bv
                    WHERE bv.blog_id IN ($placeholders)
                      AND bv.status IN ('committed', 'published')
                      AND bv.version_number = (
                          SELECT MAX(v2.version_number) FROM blog_versions v2
                          WHERE v2.blog_id = bv.blog_id AND v2.status IN ('committed', 'published')
                      )";
            $types = str_repeat('i', count($ids));
            $stmt  = $this->prepare($sql);
            Helpers::bindParams($stmt, $types, $ids);
        } elseif ($status !== null) {
            $sql = "SELECT bv.* FROM blog_versions bv
                    WHERE bv.blog_id IN ($placeholders)
                      AND bv.status = ?
                      AND bv.version_number = (
                          SELECT MAX(v2.version_number) FROM blog_versions v2
                          WHERE v2.blog_id = bv.blog_id AND v2.status = ?
                      )";
            $types  = str_repeat('i', count($ids)) . 'ss';
            $values = array_merge($ids, [$status, $status]);
            $stmt   = $this->prepare($sql);
            Helpers::bindParams($stmt, $types, $values);
        } else {
            $sql = "SELECT bv.* FROM blog_versions bv
                    WHERE bv.blog_id IN ($placeholders)
                      AND bv.version_number = (
                          SELECT MAX(v2.version_number) FROM blog_versions v2
                          WHERE v2.blog_id = bv.blog_id
                      )";
            $types = str_repeat('i', count($ids));
            $stmt  = $this->prepare($sql);
            Helpers::bindParams($stmt, $types, $ids);
        }

        $stmt->execute();
        $res    = $stmt->get_result();
        $result = [];
        while ($row = $res->fetch_assoc()) {
            $result[(int)$row['blog_id']] = $row;
        }
        $stmt->close();
        return $result;
    }
}
