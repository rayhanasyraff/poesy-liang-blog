<?php
namespace App\Services;

use App\Config;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

class WpPostService
{
    private $http;

    public function __construct()
    {
        $this->http = new Client(['timeout' => 30]);
    }

    private function fetchPage(string $baseUrl, string $token, int $limit, int $offset): array
    {
        $url = rtrim($baseUrl, '/') . "/wp_posts?limit=$limit&offset=$offset";
        try {
            $response = $this->http->get($url, [
                'headers' => [
                    'Authorization' => "Bearer $token",
                    'Content-Type'  => 'application/json',
                ],
            ]);
            $body = json_decode((string)$response->getBody(), true);
            if (!($body['success'] ?? false)) return [];
            $data = $body['data'] ?? [];
            return is_array($data) ? $data : [$data];
        } catch (GuzzleException $e) {
            error_log("WpPostService fetch error: " . $e->getMessage());
            return [];
        }
    }

    public function fetchAll(string $source): array
    {
        $cfg   = Config::get();
        $url   = $source === 'com' ? $cfg['poesyliang_com_url'] : $cfg['poesyliang_net_url'];
        $token = $source === 'com' ? $cfg['poesyliang_com_token'] : $cfg['poesyliang_net_token'];
        $limit = $cfg['pagination_limit'];

        $all    = [];
        $offset = 0;

        while (true) {
            $page = $this->fetchPage($url, $token, $limit, $offset);
            if (empty($page)) break;
            array_push($all, ...$page);
            if (count($page) < $limit) break;
            $offset += $limit;
        }

        return $all;
    }

    public function fetchPage2(string $source, int $limit, int $offset): array
    {
        $cfg   = Config::get();
        $url   = $source === 'com' ? $cfg['poesyliang_com_url'] : $cfg['poesyliang_net_url'];
        $token = $source === 'com' ? $cfg['poesyliang_com_token'] : $cfg['poesyliang_net_token'];
        return $this->fetchPage($url, $token, $limit, $offset);
    }

    /**
     * Transform a wp_post row into a blog row array ready for DB insertion.
     */
    public static function transformWpPost(array $wp, string $source): array
    {
        $now    = date('Y-m-d H:i:s');
        $nowGmt = gmdate('Y-m-d H:i:s');

        $normalizeStatus = function (string $s): string {
            return strtolower(trim($s)) === 'draft' ? 'draft' : 'published';
        };
        $normalizeComment = function (string $s): string {
            return strtolower(trim($s)) === 'open' ? 'open' : 'close';
        };
        $normalizeNotif = function (string $s): string {
            $n = strtolower(trim($s));
            return ($n === 'open' || $n === 'all') ? 'all' : 'none';
        };

        return [
            'blog_name'               => $wp['post_name']         ?? '',
            'blog_title'              => $wp['post_title']        ?? '',
            'blog_excerpt'            => $wp['post_excerpt']      ?? '',
            'blog_date_published'     => $wp['post_date']         ?? $now,
            'blog_date_published_gmt' => $wp['post_date_gmt']    ?? $nowGmt,
            'blog_content'            => $wp['post_content']      ?? '',
            'blog_status'             => $normalizeStatus($wp['post_status'] ?? ''),
            'comment_status'          => $normalizeComment($wp['comment_status'] ?? ''),
            'notification_status'     => $normalizeNotif($wp['ping_status'] ?? ''),
            'blog_date_modified'      => $wp['post_modified']     ?? $now,
            'blog_date_modified_gmt'  => $wp['post_modified_gmt'] ?? $nowGmt,
            'blog_date_created'       => $wp['post_date']         ?? $now,
            'blog_date_created_gmt'   => $wp['post_date_gmt']    ?? $nowGmt,
            'tags'                    => $wp['term_slug']         ?? '',
            'blog_visibility'         => 'private',
            'like_count'              => 0,
            'like_visibility'         => 'close',
            'view_count'              => 0,
            'view_visibility'         => 'open',
            '_source'                 => $source,
            '_original_id'            => $wp['ID'] ?? '',
            '_original_data'          => $wp,
        ];
    }

    /**
     * Combine and sort two arrays of wp_post rows by post_date ascending.
     */
    public static function combineAndSort(array $comPosts, array $netPosts): array
    {
        $all = array_merge(
            array_map(function ($p) { return self::transformWpPost($p, 'poesyliang.com'); }, $comPosts),
            array_map(function ($p) { return self::transformWpPost($p, 'poesyliang.net'); }, $netPosts)
        );

        usort($all, function (array $a, array $b) {
            return strtotime($a['blog_date_published']) <=> strtotime($b['blog_date_published']);
        });

        return $all;
    }
}
