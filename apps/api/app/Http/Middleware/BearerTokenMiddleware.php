<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Validates a static bearer token from the API_TOKEN env variable.
 * Used as a lightweight API key guard.
 */
class BearerTokenMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $apiToken = config('app.api_token', env('API_TOKEN', ''));

        if (empty($apiToken)) {
            return $next($request);
        }

        $bearer = $request->bearerToken();

        if (!$bearer || $bearer !== $apiToken) {
            return response()->json(['success' => false, 'error' => 'Unauthorized'], 401);
        }

        return $next($request);
    }
}
