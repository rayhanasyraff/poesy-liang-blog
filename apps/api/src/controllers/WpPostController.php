<?php
namespace App\Controllers;

use App\Config;
use App\Helpers;
use App\Services\WpPostService;

class WpPostController
{
    public static function health(): void
    {
        Helpers::sendJson([
            'success' => true,
            'message' => 'Poesy Liang Blog API',
            'version' => '2.0.0',
            'endpoints' => [
                'GET /poesyliang.com/wp-posts' => 'Get wp_posts from poesyliang.com',
                'GET /poesyliang.net/wp-posts' => 'Get wp_posts from poesyliang.net',
                'GET /blogs'                   => 'Get all blogs',
                'GET /blogs/{id}'              => 'Get blog by ID',
                'POST /blogs'                  => 'Create a new blog',
                'POST /migrate-wp-posts-journals-into-blogs' => 'Migrate wp_posts to blogs',
            ],
        ]);
    }

    public static function getFromCom(): void
    {
        $cfg    = Config::get();
        $limit  = isset($_GET['limit'])  ? (int)$_GET['limit']  : $cfg['pagination_limit'];
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

        $svc    = new WpPostService();
        $posts  = $svc->fetchPage2('com', $limit, $offset);

        Helpers::sendJson(['success' => true, 'count' => count($posts), 'data' => $posts]);
    }

    public static function getFromNet(): void
    {
        $cfg    = Config::get();
        $limit  = isset($_GET['limit'])  ? (int)$_GET['limit']  : $cfg['pagination_limit'];
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

        $svc   = new WpPostService();
        $posts = $svc->fetchPage2('net', $limit, $offset);

        Helpers::sendJson(['success' => true, 'count' => count($posts), 'data' => $posts]);
    }
}
