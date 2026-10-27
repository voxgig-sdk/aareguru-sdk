<?php
declare(strict_types=1);

// Aareguru SDK utility: fetcher

require_once __DIR__ . '/../core/Error.php';

class AareguruFetcher
{
    // Default User-Agent — many CDNs (notably Cloudflare) reject requests
    // with PHP's default UA (which file_get_contents doesn't even set),
    // returning 403 before the request reaches the origin. Set a Mozilla-
    // shaped UA so the SDK behaves like every other HTTP client by default.
    // Users can override by passing a User-Agent header in fetchdef.
    public const DEFAULT_USER_AGENT = 'Mozilla/5.0 (compatible; AareguruSDK/1.0)';

    // One cURL handle per process, reset between calls rather than closed:
    // curl_reset keeps the connection cache, so the next request to the
    // same host reuses the open connection.
    private static $curl = null;

    private static function curlHandle(string $fullurl)
    {
        if (self::$curl === null) {
            self::$curl = curl_init();
        } else {
            curl_reset(self::$curl);
        }
        curl_setopt(self::$curl, CURLOPT_URL, $fullurl);
        return self::$curl;
    }

    public const GETONLY_ENV = 'VOXGIG_GETONLY_GUARD';

    // A GET-only live run refuses any other method before it is sent, on
    // either transport below. The path alone: the query can carry a
    // credential, and nothing has cleaned this line.
    public static function getOnlyRefusal(string $fullurl, string $method): ?AareguruError
    {
        if (getenv(self::GETONLY_ENV) !== 'TRUE' || $method === 'GET') {
            return null;
        }
        $path = parse_url($fullurl, PHP_URL_PATH);
        $path = is_string($path) && $path !== '' ? $path : '/';
        fwrite(STDERR, "[GET-ONLY GUARD] blocked {$method} {$path}\n");
        return new AareguruError('fetch_getonly_block', "[GET-ONLY GUARD] blocked {$method} {$path}");
    }

    public static function defaultHttpFetch(string $fullurl, array $fetchdef): array
    {
        $method_str = strtoupper($fetchdef['method'] ?? 'GET');
        $refused = self::getOnlyRefusal($fullurl, $method_str);
        if (null !== $refused) {
            return [null, $refused];
        }
        $body_str = $fetchdef['body'] ?? null;
        if (is_resource($body_str)) {
            $body_str = stream_get_contents($body_str);
        }
        $headers = $fetchdef['headers'] ?? [];

        $header_lines = [];
        $has_ua = false;
        foreach ($headers as $k => $v) {
            if (is_string($v)) {
                if (strcasecmp($k, 'user-agent') === 0) {
                    $has_ua = true;
                }
                $header_lines[] = "{$k}: {$v}";
            }
        }
        if (!$has_ua) {
            $header_lines[] = 'User-Agent: ' . self::DEFAULT_USER_AGENT;
        }

        // Prefer cURL when available — its header capture is reliable across
        // PHP versions, while file_get_contents + custom stream wrappers
        // don't propagate $http_response_header for user-defined wrappers
        // in PHP 8.3+. (cURL is configured with FOLLOWLOCATION off, so the
        // manual-redirect annotation below holds there by construction.)
        if (function_exists('curl_init')) {
            return self::curlFetch($fullurl, $method_str, $body_str, $header_lines);
        }

        $opts = [
            'http' => [
                'method' => $method_str,
                'ignore_errors' => true,
            ],
        ];

        // Honour a redirect annotation on the fetch definition (set by the
        // station feature's middleware under a hosts policy): "manual"
        // surfaces a 3xx as an ordinary response instead of auto-following
        // it — the http stream wrapper otherwise replays the request,
        // headers included, against whatever host Location names, carrying
        // injected credentials to a host no policy approved.
        if (($fetchdef['redirect'] ?? null) === 'manual') {
            $opts['http']['follow_location'] = 0;
        }

        if (is_string($body_str)) {
            $opts['http']['content'] = $body_str;
        }

        if (!empty($header_lines)) {
            $opts['http']['header'] = implode("\r\n", $header_lines);
        }

        $context = stream_context_create($opts);
        error_clear_last();
        $response_body = @file_get_contents($fullurl, false, $context);

        // A request that got no answer fails the operation. The stream
        // wrapper's warning names the URL, which is left out.
        if ($response_body === false) {
            $warning = error_get_last()['message'] ?? 'request failed';
            return [null, preg_replace('/^file_get_contents\(.*?\):\s*/', '', $warning)];
        }

        $status = 0;
        $status_text = '';
        $resp_headers = [];

        $response_headers = function_exists('http_get_last_response_headers')
            ? http_get_last_response_headers()
            : ($http_response_header ?? []);

        if (is_array($response_headers)) {
            foreach ($response_headers as $header) {
                if (preg_match('/^HTTP\/\S+\s+(\d+)\s+(.*)$/i', $header, $matches)) {
                    $status = (int)$matches[1];
                    $status_text = trim($matches[2]);
                } else {
                    $parts = explode(':', $header, 2);
                    if (count($parts) === 2) {
                        $resp_headers[strtolower(trim($parts[0]))] = trim($parts[1]);
                    }
                }
            }
        }

        $json_body = null;
        $unreadable = false;
        if (trim($response_body) !== '') {
            $decoded = json_decode($response_body, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $json_body = $decoded;
            } else {
                $unreadable = true;
            }
        }

        return [
            [
                'status' => $status,
                'statusText' => $status_text,
                'headers' => $resp_headers,
                'json' => function () use ($json_body) { return $json_body; },
                'body' => $response_body,
                'unreadable' => $unreadable,
            ],
            null,
        ];
    }

    private static function curlFetch(string $fullurl, string $method, $body_str, array $header_lines): array
    {
        $ch = self::curlHandle($fullurl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HEADER, false);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        if (!empty($header_lines)) {
            curl_setopt($ch, CURLOPT_HTTPHEADER, $header_lines);
        }
        if (is_string($body_str)) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body_str);
        }

        $resp_headers = [];
        curl_setopt($ch, CURLOPT_HEADERFUNCTION,
            function ($_ch, $hdr) use (&$resp_headers) {
                $trimmed = trim($hdr);
                if ($trimmed !== '') {
                    $resp_headers[] = $trimmed;
                }
                return strlen($hdr);
            });

        $response_body = curl_exec($ch);
        if ($response_body === false) {
            $err = curl_error($ch) ?: 'curl_exec failed';
            return [
                [
                    'status' => 0,
                    'statusText' => 'Error',
                    'headers' => [],
                    'json' => function () { return null; },
                    'body' => '',
                ],
                $err,
            ];
        }

        $status = 0;
        $status_text = '';
        $resp_kv = [];
        foreach ($resp_headers as $h) {
            if (preg_match('/^HTTP\/\S+\s+(\d+)\s*(.*)$/i', $h, $m)) {
                $status = (int)$m[1];
                $status_text = trim($m[2]);
            } else {
                $parts = explode(':', $h, 2);
                if (count($parts) === 2) {
                    $resp_kv[strtolower(trim($parts[0]))] = trim($parts[1]);
                }
            }
        }

        $json_body = null;
        $unreadable = false;
        if ($response_body !== false && trim((string)$response_body) !== '') {
            $decoded = json_decode($response_body, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $json_body = $decoded;
            } else {
                $unreadable = true;
            }
        }

        return [
            [
                'status' => $status,
                'statusText' => $status_text,
                'headers' => $resp_kv,
                'json' => function () use ($json_body) { return $json_body; },
                'body' => (string)$response_body,
                'unreadable' => $unreadable,
            ],
            null,
        ];
    }

    public static function call(AareguruContext $ctx, string $fullurl, array $fetchdef): array
    {
        if ($ctx->client->mode !== 'live') {
            return [null, $ctx->make_error('fetch_mode_block',
                "Request blocked by mode: \"{$ctx->client->mode}\" (URL was: \"{$fullurl}\")")];
        }

        $options = $ctx->client->options_map();
        if (\Voxgig\Struct\Struct::getpath($options, 'feature.test.active') === true) {
            return [null, $ctx->make_error('fetch_test_block',
                "Request blocked as test feature is active (URL was: \"{$fullurl}\")")];
        }

        $sys_fetch = self::systemFetch($options);

        if (self::usesDefault($ctx)) {
            if (null !== $ctx->spec) {
                $ctx->spec->headers = self::sentHeaders($ctx->spec->headers);
            }
            return self::defaultHttpFetch($fullurl, $fetchdef);
        }
        if (is_callable($sys_fetch)) {
            return $sys_fetch($fullurl, $fetchdef);
        }

        return [null, $ctx->make_error('fetch_invalid', 'system.fetch is not a valid function')];
    }

    // getpath answers a missing path with the struct port's UNDEF sentinel:
    // one stdClass for the whole process, which setprop writes into when it
    // is handed as a parent. It must never be read, or kept, as a fetcher.
    public static function systemFetch(mixed $options): mixed
    {
        $fetch = \Voxgig\Struct\Struct::getpath($options, 'system.fetch');
        return $fetch === \Voxgig\Struct\Struct::undef() ? null : $fetch;
    }

    // An empty map or list for `system.fetch` names no fetcher either.
    public static function usesDefault(AareguruContext $ctx): bool
    {
        $sys_fetch = self::systemFetch($ctx->client->options_map());
        $is_empty_obj = ($sys_fetch instanceof \stdClass) && empty(get_object_vars($sys_fetch));
        $is_empty_arr = is_array($sys_fetch) && empty($sys_fetch);
        return $sys_fetch === null || $is_empty_obj || $is_empty_arr;
    }

    // The headers the default transport sends: the request's own, with its
    // agent when they name none. A request's headers travel by value, so the
    // transport cannot record the agent where the response is read.
    public static function sentHeaders(array $headers): array
    {
        foreach ($headers as $k => $v) {
            if (is_string($v) && strcasecmp((string)$k, 'user-agent') === 0) {
                return $headers;
            }
        }
        $headers['user-agent'] = self::DEFAULT_USER_AGENT;
        return $headers;
    }
}
