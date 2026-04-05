<?php

/**
 * Fetch secrets from Infisical and populate environment variables.
 * Results are cached in bootstrap/cache/secrets.php for 5 minutes
 * to avoid hitting the API on every request.
 */
(function () {
    $cacheFile = __DIR__ . '/cache/secrets.php';
    $cacheTtl  = 300; // seconds

    // Return cached secrets if still fresh
    if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < $cacheTtl) {
        $secrets = require $cacheFile;
    } else {
        $url   = 'https://us.infisical.com/api/v4/secrets';
        $token = getenv('INFISICAL_TOKEN');

        $ctx = stream_context_create([
            'http' => [
                'method'  => 'GET',
                'header'  => "Authorization: Bearer $token\r\nAccept: application/json\r\n",
                'timeout' => 5,
            ],
        ]);

        $raw = @file_get_contents($url, false, $ctx);
        if ($raw === false) {
            // Infisical unreachable — fall through to whatever is already in $_ENV
            return;
        }

        $data    = json_decode($raw, true);
        $secrets = [];
        foreach ($data['secrets'] ?? [] as $s) {
            $secrets[$s['secretKey']] = $s['secretValue'];
        }

        // Persist cache (only if bootstrap/cache is writable)
        if (is_writable(dirname($cacheFile))) {
            file_put_contents(
                $cacheFile,
                '<?php return ' . var_export($secrets, true) . ';'
            );
        }
    }

    foreach ($secrets as $key => $value) {
        putenv("$key=$value");
        $_ENV[$key]    = $value;
        $_SERVER[$key] = $value;
    }
})();
