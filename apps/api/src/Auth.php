<?php
namespace App;

class Auth
{
    // ── WordPress-compatible phpass password verification ─────────────────────

    private static function phpassEncode64(string $input, int $count): string
    {
        $itoa64 = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        $output = '';
        $i = 0;
        do {
            $value = ord($input[$i++]);
            $output .= $itoa64[$value & 0x3f];
            if ($i < $count) $value |= ord($input[$i]) << 8;
            $output .= $itoa64[($value >> 6) & 0x3f];
            if ($i++ >= $count) break;
            if ($i < $count) $value |= ord($input[$i]) << 8;
            $output .= $itoa64[($value >> 12) & 0x3f];
            if ($i++ >= $count) break;
            $output .= $itoa64[($value >> 18) & 0x3f];
        } while ($i < $count);
        return $output;
    }

    public static function checkPassword(string $password, string $storedHash): bool
    {
        $itoa64 = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

        // Legacy MD5
        if (strlen($storedHash) !== 34 ||
            (substr($storedHash, 0, 3) !== '$P$' && substr($storedHash, 0, 3) !== '$H$')) {
            return hash_equals(md5($password), $storedHash);
        }

        $countLog2 = strpos($itoa64, $storedHash[3]);
        if ($countLog2 < 7 || $countLog2 > 30) return false;

        $count = 1 << $countLog2;
        $salt  = substr($storedHash, 4, 8);
        if (strlen($salt) !== 8) return false;

        $hash = md5($salt . $password, true);
        do {
            $hash = md5($hash . $password, true);
        } while (--$count);

        $output = substr($storedHash, 0, 12) . self::phpassEncode64($hash, 16);
        return hash_equals($output, $storedHash);
    }

    // ── Bearer token middleware ───────────────────────────────────────────────

    public static function requireBearer(): void
    {
        $expected = Config::get()['api_token'];
        $headers  = function_exists('getallheaders') ? getallheaders() : [];
        $header   = $headers['Authorization'] ?? $headers['authorization'] ?? null;

        if (!$expected || !$header || $header !== 'Bearer ' . $expected) {
            Helpers::sendJson(['success' => false, 'error' => 'Unauthorized'], 401);
        }
    }
}
