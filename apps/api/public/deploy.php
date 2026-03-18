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
    echo "Vendor extracted successfully!";
} else {
    http_response_code(500);
    echo "Failed to extract vendor.zip";
}
