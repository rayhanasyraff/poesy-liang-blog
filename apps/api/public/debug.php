<?php
// Temporary diagnostic — remove after debugging
ini_set('display_errors', '1');
error_reporting(E_ALL);

header('Content-Type: application/json');

$results = [];

// Step 1: Try loading vendor autoload
try {
    ob_start();
    require __DIR__ . '/../vendor/autoload.php';
    ob_end_clean();
    $results['autoload'] = 'ok';
} catch (\Throwable $e) {
    ob_end_clean();
    echo json_encode(['step' => 'autoload', 'error' => $e->getMessage(), 'file' => $e->getFile(), 'line' => $e->getLine()]);
    exit;
}

// Step 2: Try loading secrets
try {
    ob_start();
    require __DIR__ . '/../bootstrap/load-secrets.php';
    ob_end_clean();
    $results['load_secrets'] = 'ok';
    $results['db_host_set']  = getenv('DB_HOST') ?: 'not set';
    $results['api_token_set'] = getenv('API_TOKEN') ? 'yes' : 'no';
} catch (\Throwable $e) {
    ob_end_clean();
    echo json_encode(['step' => 'load_secrets', 'error' => $e->getMessage(), 'file' => $e->getFile(), 'line' => $e->getLine()]);
    exit;
}

// Step 3: Try bootstrapping the Laravel app
try {
    ob_start();
    $app = require_once __DIR__ . '/../bootstrap/app.php';
    ob_end_clean();
    $results['bootstrap_app'] = 'ok';
} catch (\Throwable $e) {
    ob_end_clean();
    echo json_encode(['step' => 'bootstrap_app', 'error' => $e->getMessage(), 'file' => $e->getFile(), 'line' => $e->getLine()]);
    exit;
}

// Step 4: Try making the HTTP kernel
try {
    $kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
    $results['make_kernel'] = 'ok';
} catch (\Throwable $e) {
    echo json_encode(['step' => 'make_kernel', 'error' => $e->getMessage(), 'file' => $e->getFile(), 'line' => $e->getLine()]);
    exit;
}

echo json_encode($results, JSON_PRETTY_PRINT);
