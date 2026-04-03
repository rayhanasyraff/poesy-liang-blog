<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BlogController;
use App\Http\Controllers\BlogVersionController;
use App\Http\Controllers\LikeController;
use App\Http\Controllers\MigrationController;
use App\Http\Controllers\NormalizeController;
use App\Http\Controllers\UploadController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\WpPostController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
| GET routes:               bearer token only (static API key)
| POST/PUT/PATCH/DELETE:    jwt.auth only (user JWT from /auth/login)
| /auth/login:              bearer only (no JWT yet — this is how you get one)
*/

// ── Bearer token only (reads + login) ────────────────────────────────────

Route::middleware('bearer')->group(function () {

    // Health check
    Route::get('/', [WpPostController::class, 'health']);

    // Auth — returns JWT
    Route::post('/auth/login', [AuthController::class, 'login']);

    // Blog reads
    Route::get('/blogs/check-slug',             [BlogController::class,        'checkSlug']);
    Route::get('/blogs',                         [BlogController::class,        'index']);
    Route::get('/blogs/{id}',                    [BlogController::class,        'show'])->where('id', '[0-9]+');
    Route::get('/blogs/{id}/versions',           [BlogVersionController::class, 'index']);
    Route::get('/blogs/{id}/versions/{verId}',   [BlogVersionController::class, 'show']);
    Route::get('/blogs/{id}/likes',              [LikeController::class,        'get']);

    // User reads
    Route::get('/users',      [UserController::class, 'index']);
    Route::get('/users/{id}', [UserController::class, 'show']);

    // WordPress post sources
    Route::get('/poesyliang.com/wp-posts', [WpPostController::class, 'getFromCom']);
    Route::get('/poesyliang.net/wp-posts', [WpPostController::class, 'getFromNet']);
});

// ── JWT only (write operations) ───────────────────────────────────────────

Route::middleware('jwt.auth')->group(function () {

    // Blog writes
    Route::post('/blogs',                 [BlogController::class, 'store']);
    Route::delete('/blogs/{id}',          [BlogController::class, 'destroy'])->where('id', '[0-9]+');

    // Blog settings / unpublish
    Route::patch('/blogs/{id}/settings',  [BlogVersionController::class, 'updateSettings']);
    Route::post('/blogs/{id}/unpublish',  [BlogVersionController::class, 'unpublish']);

    // Versioning
    Route::post('/blogs/{id}/versions/draft',               [BlogVersionController::class, 'saveDraft']);
    Route::post('/blogs/{id}/versions/publish',             [BlogVersionController::class, 'publishDraft']);
    Route::post('/blogs/{id}/versions/{verId}/publish',     [BlogVersionController::class, 'publishVersion']);
    Route::post('/blogs/{id}/versions/{verId}/revert',      [BlogVersionController::class, 'revert']);

    // Likes
    Route::post('/blogs/{id}/likes',   [LikeController::class, 'add']);
    Route::delete('/blogs/{id}/likes', [LikeController::class, 'remove']);

    // User writes
    Route::post('/users',        [UserController::class, 'store']);
    Route::put('/users/{id}',    [UserController::class, 'update']);
    Route::patch('/users/{id}',  [UserController::class, 'update']);
    Route::delete('/users/{id}', [UserController::class, 'destroy']);

    // File upload
    Route::post('/upload', [UploadController::class, 'upload']);

    // Migration
    Route::post('/migrate-wp-posts-journals-into-blogs', [MigrationController::class, 'migrate']);
    Route::post('/migrate/normalize-published-versions', [NormalizeController::class,  'normalize']);
});
