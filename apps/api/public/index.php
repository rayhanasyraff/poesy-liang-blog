<?php

define('LARAVEL_START', microtime(true));

require __DIR__.'/../vendor/autoload.php';

// Load secrets from Infisical before Laravel boots.
// Dotenv is configured as immutable so .env won't overwrite these.
require __DIR__.'/../bootstrap/load-secrets.php';

$app = require_once __DIR__.'/../bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$response = $kernel->handle(
    $request = Illuminate\Http\Request::capture()
);

$response->send();

$kernel->terminate($request, $response);
