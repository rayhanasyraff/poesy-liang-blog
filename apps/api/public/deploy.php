<?php
if (!isset($_GET['key']) || $_GET['key'] !== 'xv3DEXuHsHn969ducYT3') {
    http_response_code(403);
    die('Forbidden');
}

$zipPath   = __DIR__ . '/../vendor.zip';
$extractTo = __DIR__ . '/..';

$zip = new ZipArchive;
if ($zip->open($zipPath) === TRUE) {
    $zip->extractTo($extractTo);
    $zip->close();
    unlink($zipPath);
    echo "Vendor extracted successfully!\n";
} else {
    http_response_code(500);
    echo "Failed to extract vendor.zip";
}

// Clear Laravel bootstrap cache so config/route changes take effect
$cacheDir = __DIR__ . '/../bootstrap/cache';
$cleared = [];
foreach (glob($cacheDir . '/*.php') as $file) {
    unlink($file);
    $cleared[] = basename($file);
}
echo "Cache cleared: " . (empty($cleared) ? 'nothing to clear' : implode(', ', $cleared)) . "\n";

// Run pending migrations via Artisan bootstrap (works even if shell_exec is disabled)
$appBase = __DIR__ . '/..';
require_once $appBase . '/vendor/autoload.php';
$app = require_once $appBase . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$status = $kernel->call('migrate', ['--force' => true]);
echo "Migrations: exit=$status\n";
