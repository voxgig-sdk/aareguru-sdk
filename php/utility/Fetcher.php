<?php
declare(strict_types=1);

// Aareguru SDK utility: fetcher

class AareguruFetcher
{
    public static function defaultHttpFetch(string $fullurl, array $fetchdef): array
    {
        $method_str = $fetchdef['method'] ?? 'GET';
        $body_str = $fetchdef['body'] ?? null;
        $headers = $fetchdef['headers'] ?? [];

        $opts = [
            'http' => [
                'method' => strtoupper($method_str),
                'ignore_errors' => true,
            ],
        ];

        $header_lines = [];
        foreach ($headers as $k => $v) {
            if (is_string($v)) {
                $header_lines[] = "{$k}: {$v}";
            }
        }

        if (is_string($body_str)) {
            $opts['http']['content'] = $body_str;
        }

        if (!empty($header_lines)) {
            $opts['http']['header'] = implode("\r\n", $header_lines);
        }

        $context = stream_context_create($opts);
        $response_body = @file_get_contents($fullurl, false, $context);

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
        if ($response_body !== false && $response_body !== '') {
            $decoded = json_decode($response_body, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $json_body = $decoded;
            }
        }

        return [
            [
                'status' => $status,
                'statusText' => $status_text,
                'headers' => $resp_headers,
                'json' => function () use ($json_body) { return $json_body; },
                'body' => $response_body !== false ? $response_body : '',
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

        $sys_fetch = \Voxgig\Struct\Struct::getpath($options, 'system.fetch');

        if ($sys_fetch === null) {
            return self::defaultHttpFetch($fullurl, $fetchdef);
        }
        if (is_callable($sys_fetch)) {
            return $sys_fetch($fullurl, $fetchdef);
        }

        return [null, $ctx->make_error('fetch_invalid', 'system.fetch is not a valid function')];
    }
}
