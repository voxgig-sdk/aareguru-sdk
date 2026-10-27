<?php
declare(strict_types=1);

// Aareguru SDK utility: param

require_once __DIR__ . '/../core/Helpers.php';

class AareguruParam
{
    public static function call(AareguruContext $ctx, mixed $paramdef): mixed
    {
        $pt = \Voxgig\Struct\Struct::typify($paramdef);
        if ((\Voxgig\Struct\Struct::T_string & $pt) > 0) {
            $key = $paramdef;
        } else {
            $k = \Voxgig\Struct\Struct::getprop($paramdef, 'name');
            $key = is_string($k) ? $k : '';
        }

        $akey = self::alias($ctx->point, $key);
        if ($ctx->spec && $akey !== '' &&
            self::absent(\Voxgig\Struct\Struct::getprop($ctx->reqmatch, $key)) &&
            self::absent(\Voxgig\Struct\Struct::getprop($ctx->match, $key))) {
            $ctx->spec->alias_map[$akey] = $key;
        }

        return self::value($ctx, $ctx->point, $key);
    }

    // The name a point gives a parameter in the call, if it renames it.
    private static function alias(mixed $point, string $key): string
    {
        if ($point) {
            $alias_map = AareguruHelpers::to_map(\Voxgig\Struct\Struct::getprop($point, 'alias'));
            if ($alias_map) {
                $ak = \Voxgig\Struct\Struct::getprop($alias_map, $key);
                if (is_string($ak)) {
                    return $ak;
                }
            }
        }
        return '';
    }

    private static function absent(mixed $val): bool
    {
        return $val === null || $val === '__UNDEFINED__';
    }

    // The value the call or its entity gives a point's parameter, under its
    // name or the point's alias for it.
    public static function value(AareguruContext $ctx, mixed $point, string $key): mixed
    {
        $akey = self::alias($point, $key);

        $val = \Voxgig\Struct\Struct::getprop($ctx->reqmatch, $key);
        if (self::absent($val)) {
            $val = \Voxgig\Struct\Struct::getprop($ctx->match, $key);
        }

        if (self::absent($val) && $akey !== '') {
            $val = \Voxgig\Struct\Struct::getprop($ctx->reqmatch, $akey);
        }

        if (self::absent($val)) {
            $val = \Voxgig\Struct\Struct::getprop($ctx->reqdata, $key);
        }
        if (self::absent($val)) {
            $val = \Voxgig\Struct\Struct::getprop($ctx->data, $key);
        }

        if (self::absent($val) && $akey !== '') {
            $val = \Voxgig\Struct\Struct::getprop($ctx->reqdata, $akey);
            if (self::absent($val)) {
                $val = \Voxgig\Struct\Struct::getprop($ctx->data, $akey);
            }
        }

        return self::absent($val) ? null : $val;
    }

    // The arguments a point declares in one location, query or header, each
    // with the name it travels under and the value this call passes in its
    // match or else its data. Unlike a path parameter, the entity's stored
    // match and data never supply one.
    public static function callArgs(AareguruContext $ctx, string $kind): array
    {
        $defs = $ctx->point ? \Voxgig\Struct\Struct::getpath($ctx->point, 'args.' . $kind) : null;
        $out = [];
        foreach (is_array($defs) ? $defs : [] as $ad) {
            $name = \Voxgig\Struct\Struct::getprop($ad, 'name');
            if (!is_string($name) || '' === $name) {
                continue;
            }
            $wire = \Voxgig\Struct\Struct::getprop($ad, 'orig');
            if (!is_string($wire) || '' === $wire) {
                $wire = $name;
            }
            $val = \Voxgig\Struct\Struct::getprop($ctx->reqmatch ?? [], $name);
            if (null === $val) {
                $val = \Voxgig\Struct\Struct::getprop($ctx->reqdata ?? [], $name);
            }
            $out[] = [$name, $wire, $val];
        }
        return $out;
    }
}
