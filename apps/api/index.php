<?php
declare(strict_types=1);

require_once __DIR__ . '/vendor/autoload.php';

use App\Auth;
use App\Helpers;
use App\Router;
use App\Controllers\AuthController;
use App\Controllers\BlogController;
use App\Controllers\BlogVersionController;
use App\Controllers\LikeController;
use App\Controllers\UserController;
use App\Controllers\WpPostController;
use App\Controllers\MigrationController;
use App\Controllers\NormalizeController;

// ── Global error/exception handlers ──────────────────────────────────────────

ini_set('display_errors', '0');
error_reporting(E_ALL);

set_exception_handler(function (\Throwable $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    error_log('Uncaught exception: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    echo json_encode(['success' => false, 'error' => 'Internal server error', 'message' => $e->getMessage()]);
    exit;
});

set_error_handler(function ($severity, $message, $file, $line) {
    throw new \ErrorException($message, 0, $severity, $file, $line);
});

register_shutdown_function(function () {
    $err = error_get_last();
    if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        http_response_code(500);
        header('Content-Type: application/json');
        error_log('Fatal error: ' . json_encode($err));
        echo json_encode(['success' => false, 'error' => 'Fatal error', 'message' => $err['message']]);
    }
});

// ── CORS ──────────────────────────────────────────────────────────────────────

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    echo json_encode(['success' => true, 'message' => 'preflight']);
    exit;
}

// ── Parse path ────────────────────────────────────────────────────────────────

$method = $_SERVER['REQUEST_METHOD'];
$path   = Router::parsePath();

// ── Unauthenticated routes ───────────────────────────────────────────────────

if ($path === '/' && $method === 'GET') {
    WpPostController::health();
}

if ($path === '/auth/login' && $method === 'POST') {
    AuthController::login();
}

// ── Bearer token required for all other routes ───────────────────────────────

Auth::requireBearer();

// ── Route registry ────────────────────────────────────────────────────────────

$router = new Router();

// Blog slug check (must come before /blogs/{id})
$router->add('GET', '/blogs/check-slug', function () { BlogController::checkSlug(); });

// Blog CRUD
$router->add('GET',    '/blogs',      function ()  { BlogController::getAll(); });
$router->add('POST',   '/blogs',      function ()  { BlogController::create(); });
$router->add('GET',    '/blogs/{id}', function ($p) { BlogController::getById($p); });
$router->add('DELETE', '/blogs/{id}', function ($p) { BlogController::delete($p); });

// Blog settings / unpublish
$router->add('PATCH', '/blogs/{id}/settings',  function ($p) { BlogVersionController::updateSettings($p); });
$router->add('POST',  '/blogs/{id}/unpublish', function ($p) { BlogVersionController::unpublish($p); });

// Versioning actions (fixed sub-paths before {verId} patterns)
$router->add('POST', '/blogs/{id}/versions/draft',   function ($p) { BlogVersionController::saveDraft($p); });
$router->add('POST', '/blogs/{id}/versions/publish', function ($p) { BlogVersionController::publishDraft($p); });

// Version-specific actions
$router->add('POST', '/blogs/{id}/versions/{verId}/publish', function ($p) { BlogVersionController::publishVersion($p); });
$router->add('POST', '/blogs/{id}/versions/{verId}/revert',  function ($p) { BlogVersionController::revert($p); });

// Version list / detail
$router->add('GET', '/blogs/{id}/versions',         function ($p) { BlogVersionController::list($p); });
$router->add('GET', '/blogs/{id}/versions/{verId}', function ($p) { BlogVersionController::get($p); });

// Likes
$router->add('GET',    '/blogs/{id}/likes', function ($p) { LikeController::get($p); });
$router->add('POST',   '/blogs/{id}/likes', function ($p) { LikeController::add($p); });
$router->add('DELETE', '/blogs/{id}/likes', function ($p) { LikeController::remove($p); });

// Users
$router->add('GET',    '/users',      function ()  { UserController::list(); });
$router->add('POST',   '/users',      function ()  { UserController::create(); });
$router->add('GET',    '/users/{id}', function ($p) { UserController::get($p); });
$router->add('PUT',    '/users/{id}', function ($p) { UserController::update($p); });
$router->add('PATCH',  '/users/{id}', function ($p) { UserController::update($p); });
$router->add('DELETE', '/users/{id}', function ($p) { UserController::delete($p); });

// WordPress post sources
$router->add('GET', '/poesyliang.com/wp-posts', function () { WpPostController::getFromCom(); });
$router->add('GET', '/poesyliang.net/wp-posts', function () { WpPostController::getFromNet(); });

// Migration
$router->add('POST', '/migrate-wp-posts-journals-into-blogs', function () { MigrationController::migrate(); });
$router->add('POST', '/migrate/normalize-published-versions', function () { NormalizeController::normalize(); });

// ── Dispatch ─────────────────────────────────────────────────────────────────

$router->dispatch($method, $path);
