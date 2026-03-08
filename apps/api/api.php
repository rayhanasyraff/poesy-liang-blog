<?php
// Simple blogs API - supports blog list, single blog, create blog, and version endpoints
header("Content-Type: application/json");

// Allow all origins for CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Error and exception handling to ensure API always returns JSON on fatal errors
ini_set('display_errors', '0');
error_reporting(E_ALL);
set_exception_handler(function($e) {
    http_response_code(500);
    header('Content-Type: application/json');
    error_log('Uncaught exception: ' . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Internal server error', 'message' => $e->getMessage()]);
    exit;
});
set_error_handler(function($severity, $message, $file, $line) {
    // Convert PHP warnings/notices to exceptions so they are handled uniformly
    throw new ErrorException($message, 0, $severity, $file, $line);
});
register_shutdown_function(function() {
    $err = error_get_last();
    if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        http_response_code(500);
        header('Content-Type: application/json');
        error_log('Shutdown fatal error: ' . json_encode($err));
        echo json_encode(['success' => false, 'error' => 'Fatal error', 'message' => $err['message']]);
    }
});

// Configuration: define constants here to hardcode values.
// NOTE: Do not commit real secrets. Replace placeholders locally if you choose to hardcode.
const DEFAULT_SECRET = 'g6N3wnb#DWm';
if (!defined('API_TOKEN')) {
    define('API_TOKEN', DEFAULT_SECRET);
}
if (!defined('DB_HOST')) {
    define('DB_HOST', 'localhost');
}
if (!defined('DB_USER')) {
    define('DB_USER', 'psworld_12017');
}
if (!defined('DB_PASS')) {
    define('DB_PASS', DEFAULT_SECRET);
}
if (!defined('DB_NAME')) {
    define('DB_NAME', 'psworld_12017');
}

// Basic Bearer token auth (constants only)
$expectedToken = API_TOKEN; // Use the API_TOKEN constant (set above)
$allHeaders = function_exists('getallheaders') ? getallheaders() : [];
$authHeader = $allHeaders['Authorization'] ?? $allHeaders['authorization'] ?? null;
if (!$expectedToken || !$authHeader || $authHeader !== 'Bearer ' . $expectedToken) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

// Database connection (mysqli) - constants only
$dbHost = (defined('DB_HOST') && DB_HOST !== 'localhost') ? DB_HOST : 'localhost';
$dbUser = (defined('DB_USER') && DB_USER !== 'psworld_12017') ? DB_USER : 'psworld_12017';
$dbPass = (defined('DB_PASS') && DB_PASS !== DEFAULT_SECRET) ? DB_PASS : DEFAULT_SECRET;
$dbName = (defined('DB_NAME') && DB_NAME !== 'psworld_12017') ? DB_NAME : 'psworld_12017';

$conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    error_log('DB connection failed: ' . $conn->connect_error);
    exit;
}
$conn->set_charset('utf8mb4');

// Helpers
function sendJson($payload, $code = 200) {
    http_response_code($code);
    echo json_encode($payload, JSON_PRETTY_PRINT);
    exit;
}

// Backwards-compatible alias used in some places
if (!function_exists('send_json')) {
    function send_json($payload, $code = 200) {
        return sendJson($payload, $code);
    }
}

function bad_request($msg) { sendJson(['success' => false, 'error' => $msg], 400); }

function get_request_body() {
    $input = file_get_contents('php://input');
    if (empty($input)) return [];
    $data = json_decode($input, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        bad_request('Invalid JSON input');
    }
    return $data;
}

// Parse path (support environments without PATH_INFO)
$path = $_SERVER['PATH_INFO'] ?? null;
if ($path === null) {
    $req = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $scriptDir = dirname($_SERVER['SCRIPT_NAME'] ?? '');
    if ($scriptDir !== '/' && $scriptDir !== '' && strpos($req, $scriptDir) === 0) {
        $path = substr($req, strlen($scriptDir));
    } else {
        $path = $req;
    }
}
$path = trim($path, '/');
// If the path starts with the script filename (e.g., 'api.php/...'), strip it so routes like /api.php/blogs/... work
$scriptName = basename($_SERVER['SCRIPT_NAME'] ?? '');
if ($scriptName !== '' && stripos($path, $scriptName . '/') === 0) {
    $path = substr($path, strlen($scriptName) + 1);
} elseif ($scriptName !== '' && $path === $scriptName) {
    $path = '';
}
$segments = $path === '' ? [] : explode('/', $path);
$method = $_SERVER['REQUEST_METHOD'];

// ROUTING
if (count($segments) === 0 || ($segments[0] === '')) {
    send_json([
        'success' => true,
        'message' => 'API is running',
        'available_endpoints' => [
            '/blogs (GET, POST)',
            '/blogs/{id} (GET, PUT, DELETE)',
            '/blogs/{id}/versions (GET, POST)',
            '/blogs/{id}/versions/{version_id} (GET, PUT, DELETE)'
        ]
    ]);
}

try {
    if ($segments[0] === 'blogs') {
        // /blogs
        if (!isset($segments[1])) {
            // GET list or POST create
            if ($method === 'GET') {
                $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
                $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

                // Count
                $countStmt = $conn->prepare('SELECT COUNT(*) as total FROM blogs');
                if (!$countStmt) throw new Exception($conn->error);
                $countStmt->execute();
                $total = (int)$countStmt->get_result()->fetch_assoc()['total'];
                $countStmt->close();

                $sql = 'SELECT id, blog_name, blog_title, blog_excerpt, blog_date_published, blog_date_published_gmt, blog_content, blog_status, comment_status, notification_status, blog_date_modified, blog_date_modified_gmt, tags, blog_visibility, like_count, blog_date_created, blog_date_created_gmt, like_visibility, view_count, view_visibility, blog_version FROM blogs ORDER BY id DESC LIMIT ? OFFSET ?';
                $stmt = $conn->prepare($sql);
                if (!$stmt) throw new Exception($conn->error);
                $stmt->bind_param('ii', $limit, $offset);
                $stmt->execute();
                $res = $stmt->get_result();
                $rows = [];
                while ($r = $res->fetch_assoc()) $rows[] = $r;
                $stmt->close();

                sendJson([
                    'success' => true,
                    'total_rows' => $total,
                    'returned_rows' => count($rows),
                    'limit' => $limit,
                    'offset' => $offset,
                    'data' => $rows
                ]);
            } elseif ($method === 'POST') {
                $data = get_request_body();
                // basic required fields
                $blog_name = $data['blog_name'] ?? null;
                $blog_title = $data['blog_title'] ?? null;
                if (!$blog_name || !$blog_title) bad_request('blog_name and blog_title are required');

                $blog_excerpt = $data['blog_excerpt'] ?? '';
                $blog_content = $data['blog_content'] ?? '';
                $blog_status = $data['blog_status'] ?? 'draft';
                $comment_status = $data['comment_status'] ?? 'close';
                $notification_status = $data['notification_status'] ?? 'none';
                $now = date('Y-m-d H:i:s');
                $now_gmt = gmdate('Y-m-d H:i:s');
                $tags = $data['tags'] ?? null;
                $blog_visibility = $data['blog_visibility'] ?? 'private';
                $like_count = isset($data['like_count']) ? (int)$data['like_count'] : 0;
                $like_visibility = $data['like_visibility'] ?? 'close';
                $view_count = isset($data['view_count']) ? (int)$data['view_count'] : 0;
                $view_visibility = $data['view_visibility'] ?? 'open';
                $blog_version = isset($data['blog_version']) ? (int)$data['blog_version'] : 1;

                $sql = 'INSERT INTO blogs (blog_name, blog_title, blog_excerpt, blog_content, blog_status, comment_status, notification_status, blog_date_created, blog_date_created_gmt, tags, blog_visibility, like_count, like_visibility, view_count, view_visibility, blog_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                $stmt = $conn->prepare($sql);
                if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);
                $stmt->bind_param('sssssssssssisisi', $blog_name, $blog_title, $blog_excerpt, $blog_content, $blog_status, $comment_status, $notification_status, $now, $now_gmt, $tags, $blog_visibility, $like_count, $like_visibility, $view_count, $view_visibility, $blog_version);
                if (!$stmt->execute()) throw new Exception('Insert failed: ' . $stmt->error);
                $id = $stmt->insert_id;
                $stmt->close();
                sendJson(['success' => true, 'id' => $id], 201);
            } else {
                http_response_code(405);
                sendJson(['error' => 'Method not allowed'], 405);
            }
            exit;
        }

        // /blogs/{id}/...
        $blogId = (int)$segments[1];
        if (!isset($segments[2])) {
            // GET single, PUT update, DELETE
            if ($method === 'GET') {
                $stmt = $conn->prepare('SELECT id, blog_name, blog_title, blog_excerpt, blog_date_published, blog_date_published_gmt, blog_content, blog_status, comment_status, notification_status, blog_date_modified, blog_date_modified_gmt, tags, blog_visibility, like_count, blog_date_created, blog_date_created_gmt, like_visibility, view_count, view_visibility, blog_version FROM blogs WHERE id = ?');
                if (!$stmt) throw new Exception($conn->error);
                $stmt->bind_param('i', $blogId);
                $stmt->execute();
                $res = $stmt->get_result();
                if ($res->num_rows === 0) {
                    sendJson(['success' => false, 'error' => 'Blog not found', 'id' => $blogId], 404);
                }
                $row = $res->fetch_assoc();
                $stmt->close();
                sendJson(['success' => true, 'data' => $row]);
            } elseif ($method === 'PUT') {
                $data = get_request_body();
                $fields = [];
                $types = '';
                $values = [];
                $allowed = ['blog_name','blog_title','blog_excerpt','blog_content','blog_status','comment_status','notification_status','tags','blog_visibility','like_count','like_visibility','view_count','view_visibility','blog_version'];
                foreach ($allowed as $f) {
                    if (array_key_exists($f, $data)) {
                        $fields[] = "$f = ?";
                        $values[] = $data[$f];
                        $types .= is_int($data[$f]) ? 'i' : 's';
                    }
                }
                if (count($fields) === 0) bad_request('No updatable fields provided');
                $types .= 'i';
                $values[] = $blogId;
                $sql = 'UPDATE blogs SET ' . implode(', ', $fields) . ' WHERE id = ?';
                $stmt = $conn->prepare($sql);
                if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);
                $bind = array_merge([$types], $values);
                $tmp = [];
                foreach ($bind as $k => $v) $tmp[$k] = &$bind[$k];
                call_user_func_array([$stmt, 'bind_param'], $tmp);
                if (!$stmt->execute()) throw new Exception('Update failed: ' . $stmt->error);
                sendJson(['success' => true, 'affected' => $stmt->affected_rows]);
            } elseif ($method === 'DELETE') {
                $stmt = $conn->prepare('DELETE FROM blogs WHERE id = ?');
                if (!$stmt) throw new Exception($conn->error);
                $stmt->bind_param('i', $blogId);
                $stmt->execute();
                $affected = $stmt->affected_rows;
                $stmt->close();
                sendJson(['success' => true, 'deleted' => $affected]);
            } else {
                http_response_code(405);
                sendJson(['error' => 'Method not allowed'], 405);
            }
            exit;
        }

        // Nested routes: /blogs/{id}/versions ...
        if ($segments[2] === 'versions') {
            // /blogs/{id}/versions
            if (!isset($segments[3])) {
                if ($method === 'GET') {
                    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
                    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
                    $countStmt = $conn->prepare('SELECT COUNT(*) as total FROM blog_versions WHERE blog_id = ?');
                    if (!$countStmt) throw new Exception($conn->error);
                    $countStmt->bind_param('i', $blogId);
                    $countStmt->execute();
                    $total = (int)$countStmt->get_result()->fetch_assoc()['total'];
                    $countStmt->close();

                    $stmt = $conn->prepare('SELECT * FROM blog_versions WHERE blog_id = ? ORDER BY version_number DESC LIMIT ? OFFSET ?');
                    if (!$stmt) throw new Exception($conn->error);
                    $stmt->bind_param('iii', $blogId, $limit, $offset);
                    $stmt->execute();
                    $res = $stmt->get_result();
                    $rows = [];
                    while ($r = $res->fetch_assoc()) $rows[] = $r;
                    $stmt->close();
                    sendJson(['success' => true, 'blog_id' => $blogId, 'total_rows' => $total, 'returned_rows' => count($rows), 'limit' => $limit, 'offset' => $offset, 'data' => $rows]);
                } elseif ($method === 'POST') {
                    $data = get_request_body();
                    if (!isset($data['blog_title']) || !isset($data['blog_content'])) bad_request('blog_title and blog_content are required');
                    // determine next version
                    $max = $conn->prepare('SELECT COALESCE(MAX(version_number), 0) as maxv FROM blog_versions WHERE blog_id = ?');
                    $max->bind_param('i', $blogId);
                    $max->execute();
                    $nextVersion = (int)$max->get_result()->fetch_assoc()['maxv'] + 1;
                    $max->close();

                    $parent_version_id = isset($data['parent_version_id']) && is_numeric($data['parent_version_id']) ? (int)$data['parent_version_id'] : null;
                    $blog_title = $data['blog_title'];
                    $blog_excerpt = $data['blog_excerpt'] ?? null;
                    $blog_content = $data['blog_content'];
                    $tags = $data['tags'] ?? null;
                    $commit_message = $data['commit_message'] ?? null;
                    $status = isset($data['status']) && in_array($data['status'], ['draft','committed']) ? $data['status'] : 'draft';
                    $created_by = isset($data['created_by']) ? (int)$data['created_by'] : 0;
                    $created_at = $data['created_at'] ?? date('Y-m-d H:i:s');
                    $blog_visibility = isset($data['blog_visibility']) && in_array($data['blog_visibility'], ['public','private']) ? $data['blog_visibility'] : 'public';
                    $comment_status = isset($data['comment_status']) && in_array($data['comment_status'], ['open','close']) ? $data['comment_status'] : 'close';
                    $like_visibility = isset($data['like_visibility']) && in_array($data['like_visibility'], ['open','close']) ? $data['like_visibility'] : 'open';
                    $view_visibility = isset($data['view_visibility']) && in_array($data['view_visibility'], ['open','close']) ? $data['view_visibility'] : 'open';
                    $like_count = isset($data['like_count']) ? (int)$data['like_count'] : 0;
                    $view_count = isset($data['view_count']) ? (int)$data['view_count'] : 0;

                    if ($parent_version_id === null) {
                        $sql = 'INSERT INTO blog_versions (blog_id, parent_version_id, version_number, blog_title, blog_excerpt, blog_content, tags, commit_message, status, created_by, created_at, blog_visibility, comment_status, like_visibility, view_visibility, like_count, view_count) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                        $stmt = $conn->prepare($sql);
                        if (!$stmt) throw new Exception($conn->error);
                        $stmt->bind_param('iissssssisssssii', $blogId, $nextVersion, $blog_title, $blog_excerpt, $blog_content, $tags, $commit_message, $status, $created_by, $created_at, $blog_visibility, $comment_status, $like_visibility, $view_visibility, $like_count, $view_count);
                    } else {
                        $sql = 'INSERT INTO blog_versions (blog_id, parent_version_id, version_number, blog_title, blog_excerpt, blog_content, tags, commit_message, status, created_by, created_at, blog_visibility, comment_status, like_visibility, view_visibility, like_count, view_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                        $stmt = $conn->prepare($sql);
                        if (!$stmt) throw new Exception($conn->error);
                        $stmt->bind_param('iiissssssisssssii', $blogId, $parent_version_id, $nextVersion, $blog_title, $blog_excerpt, $blog_content, $tags, $commit_message, $status, $created_by, $created_at, $blog_visibility, $comment_status, $like_visibility, $view_visibility, $like_count, $view_count);
                    }

                    if (!$stmt->execute()) throw new Exception($stmt->error);
                    $insertId = $stmt->insert_id;
                    $stmt->close();
                    sendJson(['success' => true, 'id' => $insertId, 'version_number' => $nextVersion], 201);
                } else {
                    http_response_code(405);
                    sendJson(['error' => 'Method not allowed'], 405);
                }
                exit;
            }

            // /blogs/{id}/versions/{version_id}
            $versionId = isset($segments[3]) ? (int)$segments[3] : null;
            if ($versionId === null) {
                bad_request('Missing version id');
            }
            if ($method === 'GET') {
                $stmt = $conn->prepare('SELECT * FROM blog_versions WHERE id = ? AND blog_id = ?');
                if (!$stmt) throw new Exception($conn->error);
                $stmt->bind_param('ii', $versionId, $blogId);
                $stmt->execute();
                $res = $stmt->get_result();
                if ($res->num_rows === 0) sendJson(['success' => false, 'error' => 'Version not found'], 404);
                $row = $res->fetch_assoc();
                $stmt->close();
                sendJson(['success' => true, 'data' => $row]);
            } elseif ($method === 'PUT') {
                $stmt = $conn->prepare("UPDATE blog_versions SET status = 'committed' WHERE id = ? AND blog_id = ?");
                if (!$stmt) throw new Exception($conn->error);
                $stmt->bind_param('ii', $versionId, $blogId);
                $stmt->execute();
                $affected = $stmt->affected_rows;
                $stmt->close();
                sendJson(['success' => true, 'affected' => $affected]);
            } elseif ($method === 'DELETE') {
                $stmt = $conn->prepare('DELETE FROM blog_versions WHERE id = ? AND blog_id = ?');
                if (!$stmt) throw new Exception($conn->error);
                $stmt->bind_param('ii', $versionId, $blogId);
                $stmt->execute();
                $affected = $stmt->affected_rows;
                $stmt->close();
                sendJson(['success' => true, 'deleted' => $affected]);
            } else {
                http_response_code(405);
                sendJson(['error' => 'Method not allowed'], 405);
            }
            exit;
        }

        // other subroutes not implemented
        http_response_code(404);
        sendJson(['error' => 'Endpoint not found'], 404);
    }

    // Unknown top-level route
    http_response_code(404);
    sendJson(['error' => 'Endpoint not found'], 404);
} catch (Exception $e) {
    http_response_code(500);
    error_log('API error: ' . $e->getMessage());
    send_json(['success' => false, 'error' => 'Internal server error', 'message' => $e->getMessage()], 500);
}

$conn->close();
