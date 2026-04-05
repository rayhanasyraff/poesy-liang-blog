<?php
if (!isset($_GET['key']) || $_GET['key'] !== 'xv3DEXuHsHn969ducYT3') {
    http_response_code(403);
    die('Forbidden');
}

$host = '127.0.0.1';
$port = '3306';
$db   = 'psworld_12017';
$user = 'psworld_12017';
$pass = 'g6N3wnb#DWm';

try {
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `blog_likes` (
            `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `blog_id` BIGINT UNSIGNED NOT NULL,
            `ip_address` VARCHAR(45) NOT NULL,
            `fingerprint` VARCHAR(64) NULL,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY `blog_likes_blog_id_ip_unique` (`blog_id`, `ip_address`),
            KEY `blog_likes_blog_id_index` (`blog_id`),
            KEY `blog_likes_fingerprint_index` (`fingerprint`),
            CONSTRAINT `blog_likes_blog_id_foreign` FOREIGN KEY (`blog_id`) REFERENCES `blogs` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    echo "Done. Table created (or already existed).\n";
} catch (Exception $e) {
    http_response_code(500);
    echo "Error: " . $e->getMessage() . "\n";
}
