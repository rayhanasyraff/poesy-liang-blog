<?php
namespace App\Controllers;

use App\Database;
use App\Helpers;

/**
 * POST /migrate/normalize-published-versions
 *
 * Two-pass normalization for all published blogs:
 *
 * Pass 1 — Any version with status='published' → status='committed'
 *
 * Pass 2 — Published blogs (blog_status='published'/'publish') that have zero
 *           committed/published versions get a new committed v1 from the blog
 *           row's content, followed by a draft v2 for future editing.
 *
 * Dry run (default): POST /migrate/normalize-published-versions
 * Apply:             POST /migrate/normalize-published-versions?dry=false
 */
class NormalizeController
{
    public static function normalize(): void
    {
        $db  = Database::get();
        $dry = ($_GET['dry'] ?? 'true') !== 'false';

        $summary = [
            'dry'                      => $dry,
            'blogsScanned'             => 0,
            'legacyVersionsNormalized' => 0,
            'committedVersionsCreated' => 0,
            'draftVersionsCreated'     => 0,
            'errors'                   => [],
        ];

        $pageSize = 100;
        $offset   = 0;

        while (true) {
            $stmt = $db->prepare('SELECT * FROM blogs ORDER BY id ASC LIMIT ? OFFSET ?');
            $stmt->bind_param('ii', $pageSize, $offset);
            $stmt->execute();
            $res   = $stmt->get_result();
            $blogs = [];
            while ($r = $res->fetch_assoc()) $blogs[] = $r;
            $stmt->close();

            if (empty($blogs)) break;
            $summary['blogsScanned'] += count($blogs);
            $offset += $pageSize;

            foreach ($blogs as $blog) {
                $blogId = (int)$blog['id'];
                if (!$blogId) continue;

                // Fetch all versions
                $vstmt = $db->prepare('SELECT * FROM blog_versions WHERE blog_id = ? LIMIT 200');
                $vstmt->bind_param('i', $blogId);
                $vstmt->execute();
                $vres     = $vstmt->get_result();
                $versions = [];
                while ($v = $vres->fetch_assoc()) $versions[] = $v;
                $vstmt->close();

                // ── Pass 1: normalize 'published' → 'committed' ──────────
                foreach ($versions as &$v) {
                    if ($v['status'] !== 'published') continue;
                    $summary['legacyVersionsNormalized']++;
                    if ($dry) continue;

                    $committed = 'committed';
                    $vid       = (int)$v['id'];
                    $upd = $db->prepare(
                        'UPDATE blog_versions SET status = ? WHERE id = ? AND blog_id = ?'
                    );
                    $upd->bind_param('sii', $committed, $vid, $blogId);
                    if ($upd->execute()) {
                        $v['status'] = 'committed';
                    } else {
                        $summary['errors'][] = [
                            'blogId' => $blogId,
                            'step'   => "normalize-version-{$v['id']}",
                            'error'  => $upd->error,
                        ];
                        $summary['legacyVersionsNormalized']--;
                    }
                    $upd->close();
                }
                unset($v);

                // ── Pass 2: backfill published blogs with no committed ver ─
                $blogStatus  = $blog['blog_status'] ?? '';
                $isPublished = $blogStatus === 'published' || $blogStatus === 'publish';
                if (!$isPublished) continue;

                $hasCommitted = (bool)array_filter(
                    $versions,
                    fn($v) => $v['status'] === 'committed' || $v['status'] === 'published'
                );
                if ($hasCommitted) continue;

                $summary['committedVersionsCreated']++;
                $summary['draftVersionsCreated']++;

                if ($dry) continue;

                $now         = Helpers::now();
                $publishedAt = $blog['blog_date_published'] ?? $now;
                $bt          = $blog['blog_title']          ?? 'Untitled';
                $be          = $blog['blog_excerpt']        ?? '';
                $bc          = $blog['blog_content']        ?? '';
                $tg          = $blog['tags']                ?? null;
                $bv          = $blog['blog_visibility']     ?? 'public';
                $cs          = $blog['comment_status']      ?? 'open';
                $lv          = $blog['like_visibility']     ?? 'open';
                $vv          = $blog['view_visibility']     ?? 'open';
                $lc          = (int)($blog['like_count']    ?? 0);
                $vc2         = (int)($blog['view_count']    ?? 0);

                // Step 1 — Create draft row, then commit it (api.php always inserts as given status)
                $nextVer     = self::nextVersion($db, $blogId);
                $draftStatus = 'committed'; // insert directly as committed
                $v1stmt      = $db->prepare(
                    'INSERT INTO blog_versions
                     (blog_id, version_number, blog_title, blog_excerpt, blog_content, tags,
                      status, created_by, created_at, blog_visibility, comment_status,
                      like_visibility, view_visibility, like_count, view_count, published_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)'
                );
                $v1stmt->bind_param(
                    'iissssssssssiss',
                    $blogId, $nextVer, $bt, $be, $bc, $tg, $draftStatus,
                    $publishedAt, $bv, $cs, $lv, $vv, $lc, $vc2, $publishedAt
                );
                if (!$v1stmt->execute()) {
                    $summary['errors'][] = [
                        'blogId' => $blogId, 'step' => 'create-v1-committed',
                        'error'  => $v1stmt->error,
                    ];
                    $v1stmt->close();
                    continue;
                }
                $v1Id = $v1stmt->insert_id;
                $v1stmt->close();

                // Step 2 — Point blog row at the committed version (non-fatal)
                try {
                    $upd3 = $db->prepare(
                        'UPDATE blogs SET current_published_version_id = ? WHERE id = ?'
                    );
                    $upd3->bind_param('ii', $v1Id, $blogId);
                    $upd3->execute();
                    $upd3->close();
                } catch (\Throwable $e) {
                    // Column may not exist — non-fatal
                }

                // Step 3 — Create draft v2 for future editing
                $nextVer2     = self::nextVersion($db, $blogId);
                $draftStatus2 = 'draft';
                $v2stmt       = $db->prepare(
                    'INSERT INTO blog_versions
                     (blog_id, version_number, blog_title, blog_excerpt, blog_content, tags,
                      status, created_by, created_at, blog_visibility, comment_status,
                      like_visibility, view_visibility, like_count, view_count, draft_saved_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)'
                );
                $v2stmt->bind_param(
                    'iissssssssssiss',
                    $blogId, $nextVer2, $bt, $be, $bc, $tg, $draftStatus2,
                    $now, $bv, $cs, $lv, $vv, $lc, $vc2, $now
                );
                if (!$v2stmt->execute()) {
                    $summary['errors'][] = [
                        'blogId' => $blogId, 'step' => 'create-draft-v2',
                        'error'  => $v2stmt->error,
                    ];
                    $summary['draftVersionsCreated']--;
                }
                $v2stmt->close();
            }

            if (count($blogs) < $pageSize) break;
        }

        Helpers::sendJson(['success' => true, 'summary' => $summary]);
    }

    private static function nextVersion(\mysqli $db, int $blogId): int
    {
        $stmt = $db->prepare(
            'SELECT COALESCE(MAX(version_number), 0) AS maxv FROM blog_versions WHERE blog_id = ?'
        );
        $stmt->bind_param('i', $blogId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return (int)$row['maxv'] + 1;
    }
}
