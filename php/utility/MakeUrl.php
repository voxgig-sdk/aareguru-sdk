<?php
declare(strict_types=1);

// Aareguru SDK utility: make_url

class AareguruMakeUrl
{
    public static function call(AareguruContext $ctx): array
    {
        $spec = $ctx->spec;
        $result = $ctx->result;

        if (!$spec) {
            return ['', $ctx->make_error('url_no_spec', 'Expected context spec property to be defined.')];
        }
        if (!$result) {
            return ['', $ctx->make_error('url_no_result', 'Expected context result property to be defined.')];
        }

        $url = \Voxgig\Struct\Struct::join([$spec->base, $spec->prefix, $spec->path, $spec->suffix], '/', true);
        $resmatch = [];

        // Sent with the request, never recorded as the entity's match.
        $authquery = $spec->authquery ?? [];

        // A route the definition ends with a slash keeps it, for a Django REST server,
        // and a host with no path takes /, or luasocket reads a query as the host.
        $orig = $ctx->point ? \Voxgig\Struct\Struct::getprop($ctx->point, 'orig') : null;
        if (is_string($orig) && str_ends_with($orig, '/') && '' === $spec->suffix && !str_ends_with($url, '/')) {
            $url .= '/';
        }
        $authority = strpos($url, '://');
        if (is_int($authority) && 0 < $authority && false === strpbrk(substr($url, $authority + 3), '/?#')) {
            $url .= '/';
        }

        $param_items = \Voxgig\Struct\Struct::items($spec->params);
        if ($param_items) {
            foreach ($param_items as $item) {
                $key = $item[0];
                $val = $item[1];
                if ($val !== null && is_string($key)) {
                    $placeholder = '{' . $key . '}';
                    $val_str = is_string($val) ? $val : (string)$val;
                    // A whole . or .. is a dot segment, which moves the request to another route.
                    if ('.' === $val_str || '..' === $val_str) {
                        return ['', $ctx->make_error('url_param_invalid',
                            'URL path parameter ' . $key . ' cannot be "' . $val_str . '".')];
                    }
                    $encoded = \Voxgig\Struct\Struct::escurl($val_str);
                    $url = str_replace($placeholder, $encoded, $url);
                    $resmatch[$key] = $val;
                }
            }
        }

        // A placeholder left in the route would send the request to the wrong
        // route. The base's own placeholders are server variables, resolved
        // with the options.
        $base = is_string($spec->base) ? rtrim($spec->base, '/') : '';
        $route = str_starts_with($url, $base) ? substr($url, strlen($base)) : $url;
        if (preg_match_all('/\{[^{}\/]+\}/', $route, $unfilled) > 0) {
            return ['', $ctx->make_error('url_param_missing',
                'URL path has no value for ' . implode(', ', $unfilled[0]) . '.')];
        }

        // Append query string from spec.query.
        $qsep = '?';
        $query_items = \Voxgig\Struct\Struct::items($spec->query ?? null);
        if ($query_items) {
            foreach ($query_items as $item) {
                $key = $item[0];
                $val = $item[1];
                if ($val !== null && is_string($key)) {
                    $val_str = is_string($val) ? $val : (string)$val;
                    $url .= $qsep . \Voxgig\Struct\Struct::escurl($key) . '=' . \Voxgig\Struct\Struct::escurl($val_str);
                    $qsep = '&';
                    if (!in_array($key, $authquery, true)) {
                        $resmatch[$key] = $val;
                    }
                }
            }
        }

        $result->resmatch = $resmatch;
        return [$url, null];
    }
}
