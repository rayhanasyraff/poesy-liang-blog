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

// Run pending migrations
$artisan = __DIR__ . '/../artisan';
$output = shell_exec("php $artisan migrate --force 2>&1");
echo "Migrations: " . ($output ?? 'no output') . "\n";
