<?php
namespace App;

class Config
{
    private static $data = null;

    public static function get(): array
    {
        if (self::$data !== null) {
            return self::$data;
        }

        // Load .env if present (simple key=value parser)
        $envFile = dirname(__DIR__) . '/.env';
        if (is_file($envFile)) {
            foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
                $line = trim($line);
                if ($line === '' || $line[0] === '#') continue;
                [$key, $value] = array_map('trim', explode('=', $line, 2));
                $value = trim($value, '"\'');
                if (!isset($_ENV[$key])) {
                    $_ENV[$key] = $value;
                    putenv("$key=$value");
                }
            }
        }

        self::$data = [
            'db_host'                => $_ENV['DB_HOST']                       ?? 'localhost',
            'db_user'                => $_ENV['DB_USER']                       ?? 'psworld_12017',
            'db_pass'                => $_ENV['DB_PASS']                       ?? 'g6N3wnb#DWm',
            'db_name'                => $_ENV['DB_NAME']                       ?? 'psworld_12017',
            'api_token'              => $_ENV['API_TOKEN']                     ?? 'g6N3wnb#DWm',
            'poesyliang_net_url'     => $_ENV['POESYLIANG_NET_API_BASE_URL']   ?? 'http://poesyliang.net/api.php',
            'poesyliang_net_token'   => $_ENV['POESYLIANG_NET_BEARER_TOKEN']   ?? 'g6N3wnb#DWm',
            'poesyliang_com_url'     => $_ENV['POESYLIANG_COM_API_BASE_URL']   ?? 'http://archive.poesyliang.com/api.php',
            'poesyliang_com_token'   => $_ENV['POESYLIANG_COM_BEARER_TOKEN']   ?? 'lx89nTpfm#',
            'pagination_limit'       => 5000,
        ];

        return self::$data;
    }
}
