<?php
declare(strict_types=1);

// Aareguru SDK utility: prepare_auth

class AareguruPrepareAuth
{
    private const HEADER_AUTH = 'authorization';
    private const OPTION_APIKEY = 'apikey';
    private const NOT_FOUND = '__NOTFOUND__';

    // The client's auth.name option, when set, replaces the name the API declares.
    private static function authName(array $options): string
    {
        $name = \Voxgig\Struct\Struct::getpath($options, 'auth.name');
        return is_string($name) && '' !== $name ? strtolower($name) : self::HEADER_AUTH;
    }

    public static function call(AareguruContext $ctx): array
    {
        $spec = $ctx->spec;
        if (!$spec) {
            return [null, $ctx->make_error('auth_no_spec', 'Expected context spec property to be defined.')];
        }

        $headers = &$spec->headers;
        $options = $ctx->client->options_map();

        // Public APIs that need no auth omit the options.auth block entirely.
        if (!isset($options['auth']) || $options['auth'] === null) {
            unset($headers[self::HEADER_AUTH]);
            return [$spec, null];
        }

        $name = self::authName($options);

        // A credential left under the declared name would travel beside the renamed one.
        if ($name !== self::HEADER_AUTH) {
            unset($headers[self::HEADER_AUTH]);
        }

        $apikey = \Voxgig\Struct\Struct::getprop($options, self::OPTION_APIKEY, self::NOT_FOUND);

        if (
            (is_string($apikey) && ($apikey === self::NOT_FOUND || $apikey === ''))
            || $apikey === null
        ) {
            unset($headers[$name]);
        } else {
            $auth_prefix = \Voxgig\Struct\Struct::getpath($options, 'auth.prefix') ?? '';
            $apikey_val = is_string($apikey) ? $apikey : '';
            // Empty prefix (raw apiKey credential) must not add a leading space.
            $headers[$name] = $auth_prefix === ''
                ? $apikey_val : "{$auth_prefix} {$apikey_val}";
        }

        return [$spec, null];
    }
}
