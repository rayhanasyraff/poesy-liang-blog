<?php

namespace App\Http;

use Illuminate\Foundation\Http\Kernel as HttpKernel;

class Kernel extends HttpKernel
{
    protected $middleware = [
        \Fruitcake\Cors\HandleCors::class,
        \Illuminate\Foundation\Http\Middleware\CheckForMaintenanceMode::class,
        \Illuminate\Foundation\Http\Middleware\ValidatePostSize::class,
        \App\Http\Middleware\TrimStrings::class,
        \Illuminate\Foundation\Http\Middleware\ConvertEmptyStringsToNull::class,
    ];

    protected $middlewareGroups = [
        'web' => [
            \Illuminate\Cookie\Middleware\EncryptCookies::class,
            \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
            \Illuminate\Session\Middleware\StartSession::class,
            \Illuminate\View\Middleware\ShareErrorsFromSession::class,
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
        ],
        'api' => [
            'throttle:500,1',
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
        ],
    ];

    protected $routeMiddleware = [
        'auth'       => \App\Http\Middleware\Authenticate::class,
        'jwt.auth'   => \Tymon\JWTAuth\Http\Middleware\Authenticate::class,
        'jwt.verify' => \Tymon\JWTAuth\Http\Middleware\Check::class,
        'bearer'     => \App\Http\Middleware\BearerTokenMiddleware::class,
        'throttle'   => \Illuminate\Routing\Middleware\ThrottleRequests::class,
        'permission' => \Spatie\Permission\Middlewares\PermissionMiddleware::class,
        'role'       => \Spatie\Permission\Middlewares\RoleMiddleware::class,
    ];
}
