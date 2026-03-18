<?php
// Temporary diagnostic — remove after debugging
ini_set('display_errors', '1');
error_reporting(E_ALL);

header('Content-Type: application/json');

$checks = [
    'php_version'        => PHP_VERSION,
    'php_version_id'     => PHP_VERSION_ID,
    'env_file_exists'    => file_exists(__DIR__ . '/../.env'),
    'vendor_exists'      => file_exists(__DIR__ . '/../vendor/autoload.php'),
    'bootstrap_exists'   => file_exists(__DIR__ . '/../bootstrap/app.php'),
    'storage_writable'   => is_writable(__DIR__ . '/../storage'),
    'cache_writable'     => is_writable(__DIR__ . '/../bootstrap/cache'),
    'extensions'         => [
        'pdo'       => extension_loaded('pdo'),
        'pdo_mysql' => extension_loaded('pdo_mysql'),
        'mbstring'  => extension_loaded('mbstring'),
        'openssl'   => extension_loaded('openssl'),
        'tokenizer' => extension_loaded('tokenizer'),
        'xml'       => extension_loaded('xml'),
        'json'      => extension_loaded('json'),
    ],
];

// Try to read APP_KEY from .env (without loading Laravel)
if ($checks['env_file_exists']) {
    $env = file_get_contents(__DIR__ . '/../.env');
    preg_match('/^APP_KEY=(.+)$/m', $env, $m);
    $checks['app_key_set'] = isset($m[1]) && trim($m[1]) !== '';
    preg_match('/^APP_DEBUG=(.+)$/m', $env, $d);
    $checks['app_debug'] = isset($d[1]) ? trim($d[1]) : 'not set';
} else {
    $checks['app_key_set'] = false;
}

echo json_encode($checks, JSON_PRETTY_PRINT);
