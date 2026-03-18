<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BlogController;
use App\Http\Controllers\BlogVersionController;
use App\Http\Controllers\LikeController;
use App\Http\Controllers\MigrationController;
use App\Http\Controllers\NormalizeController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\WpPostController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
| All routes require the static bearer token middleware.
| POST /auth/login is excluded from JWT auth — it issues the token.
*/

// Health check (bearer token required)
Route::middleware('bearer')->get('/', [WpPostController::class, 'health']);

// Auth — bearer token required to call login, returns JWT
Route::middleware('bearer')->post('/auth/login', [AuthController::class, 'login']);

// All remaining routes require valid JWT
Route::middleware(['bearer', 'jwt.auth'])->group(function () {

    // Blog slug check (must come before /blogs/{id})
    Route::get('/blogs/check-slug', [BlogController::class, 'checkSlug']);

    // Blog CRUD
    Route::get('/blogs',          [BlogController::class, 'index']);
    Route::post('/blogs',         [BlogController::class, 'store']);
    Route::get('/blogs/{id}',     [BlogController::class, 'show'])->where('id', '[0-9]+');
    Route::delete('/blogs/{id}',  [BlogController::class, 'destroy'])->where('id', '[0-9]+');

    // Blog settings / unpublish
    Route::patch('/blogs/{id}/settings',  [BlogVersionController::class, 'updateSettings']);
    Route::post('/blogs/{id}/unpublish',  [BlogVersionController::class, 'unpublish']);

    // Versioning fixed sub-paths (must come before {verId} patterns)
    Route::post('/blogs/{id}/versions/draft',   [BlogVersionController::class, 'saveDraft']);
    Route::post('/blogs/{id}/versions/publish', [BlogVersionController::class, 'publishDraft']);

    // Version-specific actions
    Route::post('/blogs/{id}/versions/{verId}/publish', [BlogVersionController::class, 'publishVersion']);
    Route::post('/blogs/{id}/versions/{verId}/revert',  [BlogVersionController::class, 'revert']);

    // Version list / detail
    Route::get('/blogs/{id}/versions',          [BlogVersionController::class, 'index']);
    Route::get('/blogs/{id}/versions/{verId}',  [BlogVersionController::class, 'show']);

    // Likes
    Route::get('/blogs/{id}/likes',    [LikeController::class, 'get']);
    Route::post('/blogs/{id}/likes',   [LikeController::class, 'add']);
    Route::delete('/blogs/{id}/likes', [LikeController::class, 'remove']);

    // Users
    Route::get('/users',         [UserController::class, 'index']);
    Route::post('/users',        [UserController::class, 'store']);
    Route::get('/users/{id}',    [UserController::class, 'show']);
    Route::put('/users/{id}',    [UserController::class, 'update']);
    Route::patch('/users/{id}',  [UserController::class, 'update']);
    Route::delete('/users/{id}', [UserController::class, 'destroy']);

    // WordPress post sources
    Route::get('/poesyliang.com/wp-posts', [WpPostController::class, 'getFromCom']);
    Route::get('/poesyliang.net/wp-posts', [WpPostController::class, 'getFromNet']);

    // Migration
    Route::post('/migrate-wp-posts-journals-into-blogs',  [MigrationController::class,  'migrate']);
    Route::post('/migrate/normalize-published-versions',  [NormalizeController::class,  'normalize']);
});
