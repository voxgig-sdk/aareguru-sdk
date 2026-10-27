<?php
declare(strict_types=1);

// Aareguru SDK utility: prepare_headers

require_once __DIR__ . '/Param.php';
require_once __DIR__ . '/Media.php';

class AareguruPrepareHeaders
{
    public static function call(AareguruContext $ctx): array
    {
        $options = $ctx->client->options_map();
        $headers = \Voxgig\Struct\Struct::getprop($options, 'headers');
        $out = $headers ? \Voxgig\Struct\Struct::clone($headers) : [];
        if (!is_array($out)) {
            $out = [];
        }
        $out = AareguruMedia::headers($ctx->point, $out);
        // A header argument replaces a default of the same name, whatever its
        // case.
        foreach (AareguruParam::callArgs($ctx, 'header') as [$name, $orig, $val]) {
            if (null !== $val) {
                $wire = strtolower($orig);
                foreach (array_keys($out) as $key) {
                    if (is_string($key) && strtolower($key) === $wire) {
                        unset($out[$key]);
                    }
                }
                $out[$wire] = \Voxgig\Struct\Struct::stringify($val);
            }
        }
        // A cookie argument travels in the cookie header, form serialized and
        // percent-encoded, replacing a cookie of the same name among those the
        // caller's headers already send.
        $sent = [];
        foreach (AareguruParam::callArgs($ctx, 'cookie') as [$name, $orig, $val]) {
            if (null !== $val) {
                $sent[] = [$orig, $val];
            }
        }
        if (0 < count($sent)) {
            $names = array_merge(...array_map(
                fn($arg) => \Voxgig\Struct\Struct::ismap($arg[1])
                    ? array_map(fn($key) => \Voxgig\Struct\Struct::escurl((string) $key),
                        \Voxgig\Struct\Struct::keysof($arg[1]))
                    : [$arg[0]],
                $sent
            ));
            $kept = [];
            foreach (array_keys($out) as $key) {
                if (!is_string($key) || 'cookie' !== strtolower($key)) {
                    continue;
                }
                $given = $out[$key];
                unset($out[$key]);
                if (!is_string($given)) {
                    continue;
                }
                $kept = array_merge($kept, self::cookieKeep($given, $names));
            }
            foreach ($sent as [$orig, $val]) {
                $pair = self::cookiePair($orig, $val);
                if ('' !== $pair) {
                    $kept[] = $pair;
                }
            }
            if (0 < count($kept)) {
                $out['cookie'] = implode('; ', $kept);
            }
        }
        return $out;
    }

    // The form style of a cookie parameter: a list repeats the name, a map
    // sends its own keys, and every value is percent-encoded.
    private static function cookiePair(string $wire, mixed $val): string
    {
        $esc = fn($v) => \Voxgig\Struct\Struct::escurl(\Voxgig\Struct\Struct::stringify($v));
        if (\Voxgig\Struct\Struct::islist($val)) {
            $pairs = array_map(fn($item) => $wire . '=' . $esc($item), $val);
        } elseif (\Voxgig\Struct\Struct::ismap($val)) {
            $pairs = array_map(
                fn($key) => \Voxgig\Struct\Struct::escurl((string) $key) . '='
                    . $esc(\Voxgig\Struct\Struct::getprop($val, $key)),
                \Voxgig\Struct\Struct::keysof($val)
            );
        } else {
            $pairs = [$wire . '=' . $esc($val)];
        }
        return implode('; ', $pairs);
    }

    // The caller's cookie pieces with the named cookies removed: a cookie is
    // one ;-delimited piece, whatever its value holds.
    public static function cookieKeep(string $header, array $names): array
    {
        $kept = [];
        foreach (explode(';', $header) as $piece) {
            $cookie = trim($piece);
            if ('' !== $cookie && !in_array(trim(explode('=', $cookie, 2)[0]), $names, true)) {
                $kept[] = $cookie;
            }
        }
        return $kept;
    }
}
