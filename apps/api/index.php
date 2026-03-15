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

set_exception_handler(function (\Throwable $e): void {
    http_response_code(500);
    header('Content-Type: application/json');
    error_log('Uncaught exception: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    echo json_encode(['success' => false, 'error' => 'Internal server error', 'message' => $e->getMessage()]);
    exit;
});

set_error_handler(function (int $severity, string $message, string $file, int $line): bool {
    throw new \ErrorException($message, 0, $severity, $file, $line);
});

register_shutdown_function(function (): void {
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

// Blog slug check (must come before /blogs/{id} to avoid treating "check-slug" as an ID)
$router->add('GET',   '/blogs/check-slug', fn() => BlogController::checkSlug());

// Blog CRUD
$router->add('GET',    '/blogs',      fn() => BlogController::getAll());
$router->add('POST',   '/blogs',      fn() => BlogController::create());
$router->add('GET',    '/blogs/{id}', fn($p) => BlogController::getById($p));
$router->add('DELETE', '/blogs/{id}', fn($p) => BlogController::delete($p));

// Blog settings / unpublish
$router->add('PATCH', '/blogs/{id}/settings',   fn($p) => BlogVersionController::updateSettings($p));
$router->add('POST',  '/blogs/{id}/unpublish',   fn($p) => BlogVersionController::unpublish($p));

// Versioning actions (fixed sub-paths before {verId} patterns)
$router->add('POST', '/blogs/{id}/versions/draft',   fn($p) => BlogVersionController::saveDraft($p));
$router->add('POST', '/blogs/{id}/versions/publish', fn($p) => BlogVersionController::publishDraft($p));

// Version-specific actions
$router->add('POST', '/blogs/{id}/versions/{verId}/publish', fn($p) => BlogVersionController::publishVersion($p));
$router->add('POST', '/blogs/{id}/versions/{verId}/revert',  fn($p) => BlogVersionController::revert($p));

// Version list / detail (raw pass-through to underlying DB)
$router->add('GET',  '/blogs/{id}/versions',        fn($p) => BlogVersionController::list($p));
$router->add('GET',  '/blogs/{id}/versions/{verId}', fn($p) => BlogVersionController::get($p));

// Likes
$router->add('GET',    '/blogs/{id}/likes', fn($p) => LikeController::get($p));
$router->add('POST',   '/blogs/{id}/likes', fn($p) => LikeController::add($p));
$router->add('DELETE', '/blogs/{id}/likes', fn($p) => LikeController::remove($p));

// Users
$router->add('GET',    '/users',      fn() => UserController::list());
$router->add('POST',   '/users',      fn() => UserController::create());
$router->add('GET',    '/users/{id}', fn($p) => UserController::get($p));
$router->add('PUT',    '/users/{id}', fn($p) => UserController::update($p));
$router->add('PATCH',  '/users/{id}', fn($p) => UserController::update($p));
$router->add('DELETE', '/users/{id}', fn($p) => UserController::delete($p));

// WordPress post sources
$router->add('GET', '/poesyliang.com/wp-posts', fn() => WpPostController::getFromCom());
$router->add('GET', '/poesyliang.net/wp-posts', fn() => WpPostController::getFromNet());

// Migration
$router->add('POST', '/migrate-wp-posts-journals-into-blogs',   fn() => MigrationController::migrate());
$router->add('POST', '/migrate/normalize-published-versions',   fn() => NormalizeController::normalize());

// ── Dispatch ─────────────────────────────────────────────────────────────────

$router->dispatch($method, $path);
