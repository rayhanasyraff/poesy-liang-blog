<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Validation\ValidationException;
use Illuminate\Http\Exceptions\PostTooLargeException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Tymon\JWTAuth\Exceptions\JWTException;
use Throwable;

class Handler extends ExceptionHandler
{
    protected $dontReport = [];

    protected $dontFlash = ['password', 'password_confirmation'];

    public function report(Throwable $exception)
    {
        parent::report($exception);
    }

    public function render($request, Throwable $exception)
    {
        if ($exception instanceof NotFoundHttpException) {
            return response()->json(['success' => false, 'error' => 'Not found'], 404);
        }

        if ($exception instanceof MethodNotAllowedHttpException) {
            return response()->json(['success' => false, 'error' => 'Method not allowed'], 405);
        }

        if ($exception instanceof ValidationException) {
            return response()->json([
                'success' => false,
                'error'   => 'Validation failed',
                'errors'  => $exception->errors(),
            ], 422);
        }

        if ($exception instanceof AuthenticationException) {
            return response()->json(['success' => false, 'error' => 'Unauthenticated'], 401);
        }

        if ($exception instanceof PostTooLargeException) {
            return response()->json(['success' => false, 'error' => 'Request body too large'], 413);
        }

        // JWT token absent, expired, or invalid — return 401 not 500
        if ($exception instanceof JWTException) {
            return response()->json(['success' => false, 'error' => 'Token invalid or expired'], 401);
        }

        // Any other Symfony HTTP exception (e.g. UnauthorizedHttpException from Tymon) —
        // use its own status code instead of falling through to 500.
        if ($exception instanceof HttpException) {
            $status = $exception->getStatusCode();
            return response()->json(['success' => false, 'error' => $exception->getMessage() ?: 'HTTP error'], $status);
        }

        if (config('app.debug')) {
            return response()->json([
                'success' => false,
                'error'   => $exception->getMessage(),
                'trace'   => $exception->getTrace(),
            ], 500);
        }

        return response()->json(['success' => false, 'error' => 'Internal server error'], 500);
    }
}
