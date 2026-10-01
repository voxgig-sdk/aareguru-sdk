<?php
declare(strict_types=1);

// Aareguru SDK utility: prepare_headers

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
        // A header parameter travels as a header, under the name the
        // definition gives it, and only from this call's own arguments. It
        // replaces a default of the same name, whatever its case.
        $hl = $ctx->point ? \Voxgig\Struct\Struct::getpath($ctx->point, 'args.header') : null;
        if (is_array($hl)) {
            foreach ($hl as $hd) {
                $name = \Voxgig\Struct\Struct::getprop($hd, 'name');
                if (!is_string($name) || '' === $name) {
                    continue;
                }
                $orig = \Voxgig\Struct\Struct::getprop($hd, 'orig');
                if (!is_string($orig) || '' === $orig) {
                    $orig = $name;
                }
                $val = \Voxgig\Struct\Struct::getprop($ctx->reqmatch ?? [], $name);
                if (null === $val) {
                    $val = \Voxgig\Struct\Struct::getprop($ctx->reqdata ?? [], $name);
                }
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
        }
        return $out;
    }
}
