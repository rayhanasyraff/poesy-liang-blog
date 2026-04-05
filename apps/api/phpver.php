<?php
echo json_encode([
    'php_version' => PHP_VERSION,
    'php_version_id' => PHP_VERSION_ID,
    'sapi' => PHP_SAPI,
    'vendor_exists' => file_exists(__DIR__ . '/vendor/autoload.php'),
    'platform_check' => file_exists(__DIR__ . '/vendor/composer/platform_check.php'),
]);
