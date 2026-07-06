<?php
/*
 * Composer – server-side storage API
 *
 * GET  api.php        → returns posts.txt contents (JSON array)
 * POST api.php        → validates & writes new contents to posts.txt
 *
 * Data file: posts.txt (same directory as this script)
 * Max size:  50 MB
 */

$DATA_FILE = __DIR__ . '/posts.txt';
$MAX_BYTES = 50 * 1024 * 1024; // 50 MB

header('Content-Type: application/json; charset=utf-8');
// Allow same-origin requests; tighten this if you add authentication
header('Cache-Control: no-store');

// ── CORS pre-flight ─────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? '';

// ── GET: return stored posts ────────────────────────────────
if ($method === 'GET') {
    if (!file_exists($DATA_FILE)) {
        echo '[]';
    } else {
        readfile($DATA_FILE);
    }
    exit;
}

// ── POST: validate and persist ─────────────────────────────
if ($method === 'POST') {
    $body = file_get_contents('php://input');

    if ($body === false || trim($body) === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Empty request body']);
        exit;
    }

    // Must be a valid JSON array
    $decoded = json_decode($body);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($decoded)) {
        http_response_code(400);
        echo json_encode(['error' => 'Body must be a JSON array (json error: ' . json_last_error_msg() . ')']);
        exit;
    }

    // Enforce 50 MB limit
    $size = strlen($body);
    if ($size > $MAX_BYTES) {
        $mb = round($size / 1048576, 2);
        http_response_code(413);
        echo json_encode(['error' => "Data is {$mb} MB, which exceeds the 50 MB limit"]);
        exit;
    }

    // Write atomically: write to a temp file, then rename over the real one.
    // This prevents a partial write from corrupting the data.
    $tmp = $DATA_FILE . '.tmp.' . getmypid();
    if (file_put_contents($tmp, $body, LOCK_EX) === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Could not write temp file – check directory permissions']);
        exit;
    }
    if (!rename($tmp, $DATA_FILE)) {
        @unlink($tmp);
        http_response_code(500);
        echo json_encode(['error' => 'Could not finalize data file']);
        exit;
    }

    $kb = round($size / 1024, 1);
    echo json_encode(['ok' => true, 'bytes' => $size, 'kb' => $kb]);
    exit;
}

// ── Everything else ─────────────────────────────────────────
http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
