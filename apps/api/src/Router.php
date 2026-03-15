<?php
namespace App;

class Router
{
    private array $routes = [];

    public function add(string $method, string $pattern, callable $handler): void
    {
        $this->routes[] = [$method, $pattern, $handler];
    }

    public function dispatch(string $method, string $path): void
    {
        foreach ($this->routes as [$routeMethod, $pattern, $handler]) {
            if (strtoupper($routeMethod) !== strtoupper($method)) continue;

            $params = $this->match($pattern, $path);
            if ($params !== null) {
                $handler($params);
                return;
            }
        }

        Helpers::sendJson(['success' => false, 'error' => 'Endpoint not found'], 404);
    }

    private function match(string $pattern, string $path): ?array
    {
        // Escape dots for literal matching (e.g. "poesyliang.com")
        $regex = preg_quote($pattern, '@');
        // Replace escaped \{param\} placeholders with named capture groups
        $regex = preg_replace('/\\\\\{(\w+)\\\\\}/', '(?P<$1>[^/]+)', $regex);
        $regex = '@^' . $regex . '$@';

        if (preg_match($regex, $path, $matches)) {
            return array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
        }

        return null;
    }

    public static function parsePath(): string
    {
        $uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/';
        $script = dirname($_SERVER['SCRIPT_NAME'] ?? '');

        if ($script !== '/' && $script !== '' && str_starts_with($uri, $script)) {
            $uri = substr($uri, strlen($script));
        }

        $uri = '/' . trim($uri, '/');

        // Strip script filename if present (e.g. /index.php/blogs → /blogs)
        $filename = '/' . basename($_SERVER['SCRIPT_NAME'] ?? 'index.php');
        if (str_starts_with($uri, $filename . '/')) {
            $uri = substr($uri, strlen($filename));
        } elseif ($uri === $filename) {
            $uri = '/';
        }

        return $uri === '' ? '/' : $uri;
    }
}
