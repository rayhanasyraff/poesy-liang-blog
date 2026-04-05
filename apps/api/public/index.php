<?php

define('LARAVEL_START', microtime(true));

require __DIR__.'/../vendor/autoload.php';

// Load secrets from Infisical before Laravel boots.
// Dotenv is configured as immutable so .env won't overwrite these.
require __DIR__.'/../bootstrap/load-secrets.php';

// The app lives at /api/ on the server. Tell Symfony the script lives at
// /api/index.php so it strips /api from REQUEST_URI when computing the path.
$_SERVER['SCRIPT_NAME'] = '/api/index.php';
$_SERVER['PHP_SELF']    = '/api/index.php';

$app = require_once __DIR__.'/../bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$response = $kernel->handle(
    $request = Illuminate\Http\Request::capture()
);

$response->send();

$kernel->terminate($request, $response);
