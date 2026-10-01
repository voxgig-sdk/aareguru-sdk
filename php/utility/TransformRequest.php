<?php
declare(strict_types=1);

// Aareguru SDK utility: transform_request

require_once __DIR__ . '/../core/Helpers.php';

class AareguruTransformRequest
{
    public static function call(AareguruContext $ctx): mixed
    {
        $spec = $ctx->spec;
        $point = $ctx->point;
        if ($spec) {
            $spec->step = 'reqform';
        }
        $data = self::omit($ctx->reqdata, self::header_arg_names($point));
        $transform = AareguruHelpers::to_map(\Voxgig\Struct\Struct::getprop($point, 'transform'));
        if (!$transform) {
            return self::strip_action($data);
        }
        $reqform = \Voxgig\Struct\Struct::getprop($transform, 'req');
        if (!$reqform) {
            return self::strip_action($data);
        }
        return self::strip_action(\Voxgig\Struct\Struct::transform(['reqdata' => $data], $reqform));
    }

    // `$action` selects the point (see MakePoint); it is never an API field,
    // so the body is a copy without it. Arrays are values, so the unset
    // never reaches the caller's copy.
    private static function strip_action(mixed $reqdata): mixed
    {
        return self::omit($reqdata, ['$action']);
    }

    // A header argument travels as a header, which PrepareHeaders sends, so
    // the body is built from the request data without it.
    private static function header_arg_names(mixed $point): array
    {
        $hl = $point ? \Voxgig\Struct\Struct::getpath($point, 'args.header') : null;
        $names = [];
        foreach (is_array($hl) ? $hl : [] as $hd) {
            $name = \Voxgig\Struct\Struct::getprop($hd, 'name');
            if (is_string($name) && '' !== $name) {
                $names[] = $name;
            }
        }
        return $names;
    }

    private static function omit(mixed $reqdata, array $names): mixed
    {
        if (!is_array($reqdata)) {
            return $reqdata;
        }
        foreach ($names as $name) {
            unset($reqdata[$name]);
        }
        return $reqdata;
    }
}
