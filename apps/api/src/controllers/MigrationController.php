<?php
namespace App\Controllers;

use App\Database;
use App\Helpers;
use App\Services\WpPostService;

class MigrationController
{
    // POST /migrate-wp-posts-journals-into-blogs
    public static function migrate(): void
    {
        $db  = Database::get();
        $svc = new WpPostService();

        $comPosts = $svc->fetchAll('com');
        $netPosts = $svc->fetchAll('net');
        $combined = WpPostService::combineAndSort($comPosts, $netPosts);

        $successList = [];
        $failedList  = [];

        foreach ($combined as $blog) {
            $source     = $blog['_source'];
            $originalId = $blog['_original_id'];
            $origData   = $blog['_original_data'];
            unset($blog['_source'], $blog['_original_id'], $blog['_original_data']);

            try {
                $id = self::insertBlog($db, $blog);

                $successList[] = [
                    'id'              => $id,
                    'title'           => $blog['blog_title'],
                    'date'            => $blog['blog_date_published'],
                    'source'          => $source,
                    'original_id'     => $originalId,
                    'original_data'   => $origData,
                    'transformed_data' => $blog,
                    'debug_info' => [
                        'blog_name'            => $blog['blog_name'],
                        'blog_status'          => $blog['blog_status'],
                        'comment_status'       => $blog['comment_status'],
                        'notification_status'  => $blog['notification_status'],
                        'has_content'          => !empty($blog['blog_content']),
                        'content_length'       => strlen($blog['blog_content'] ?? ''),
                    ],
                ];
            } catch (\Throwable $e) {
                $failedList[] = [
                    'title'            => $blog['blog_title'],
                    'date'             => $blog['blog_date_published'],
                    'source'           => $source,
                    'original_id'      => $originalId,
                    'original_data'    => $origData,
                    'transformed_data' => $blog,
                    'error'            => $e->getMessage(),
                    'errorDetails'     => $e->getMessage(),
                    'debug_info' => [
                        'blog_name'           => $blog['blog_name'],
                        'blog_status'         => $blog['blog_status'],
                        'comment_status'      => $blog['comment_status'],
                        'notification_status' => $blog['notification_status'],
                        'has_content'         => !empty($blog['blog_content']),
                        'content_length'      => strlen($blog['blog_content'] ?? ''),
                    ],
                ];
            }
        }

        Helpers::sendJson([
            'success' => true,
            'summary' => [
                'timestamp'       => date('c'),
                'total_processed' => count($combined),
                'successful'      => count($successList),
                'failed'          => count($failedList),
                'success_data'    => $successList,
                'failed_data'     => $failedList,
            ],
        ]);
    }

    private static function insertBlog(\mysqli $db, array $data): int
    {
        $blog_name           = $data['blog_name']           ?? '';
        $blog_title          = $data['blog_title']          ?? '';
        $blog_excerpt        = $data['blog_excerpt']        ?? '';
        $blog_content        = $data['blog_content']        ?? '';
        $blog_status         = $data['blog_status']         ?? 'draft';
        $comment_status      = $data['comment_status']      ?? 'close';
        $notification_status = $data['notification_status'] ?? 'none';
        $blog_date_published     = $data['blog_date_published']     ?? Helpers::now();
        $blog_date_published_gmt = $data['blog_date_published_gmt'] ?? Helpers::nowGmt();
        $blog_date_modified      = $data['blog_date_modified']      ?? Helpers::now();
        $blog_date_modified_gmt  = $data['blog_date_modified_gmt']  ?? Helpers::nowGmt();
        $blog_date_created       = $data['blog_date_created']       ?? Helpers::now();
        $blog_date_created_gmt   = $data['blog_date_created_gmt']   ?? Helpers::nowGmt();
        $tags                = $data['tags']                ?? null;
        $blog_visibility     = $data['blog_visibility']     ?? 'private';
        $like_count          = (int)($data['like_count']    ?? 0);
        $like_visibility     = $data['like_visibility']     ?? 'close';
        $view_count          = (int)($data['view_count']    ?? 0);
        $view_visibility     = $data['view_visibility']     ?? 'open';

        $stmt = $db->prepare(
            'INSERT INTO blogs (blog_name, blog_title, blog_excerpt, blog_content, blog_status,
             comment_status, notification_status,
             blog_date_published, blog_date_published_gmt,
             blog_date_modified, blog_date_modified_gmt,
             blog_date_created, blog_date_created_gmt,
             tags, blog_visibility, like_count, like_visibility, view_count, view_visibility)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        if (!$stmt) throw new \RuntimeException('Prepare failed: ' . $db->error);
        $stmt->bind_param(
            'sssssssssssssssisis',
            $blog_name, $blog_title, $blog_excerpt, $blog_content, $blog_status,
            $comment_status, $notification_status,
            $blog_date_published, $blog_date_published_gmt,
            $blog_date_modified, $blog_date_modified_gmt,
            $blog_date_created, $blog_date_created_gmt,
            $tags, $blog_visibility, $like_count, $like_visibility, $view_count, $view_visibility
        );
        if (!$stmt->execute()) throw new \RuntimeException('Insert failed: ' . $stmt->error);
        $id = $stmt->insert_id;
        $stmt->close();
        return $id;
    }
}
