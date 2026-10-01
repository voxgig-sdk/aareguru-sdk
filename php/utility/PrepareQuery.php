<?php
declare(strict_types=1);

// Aareguru SDK utility: prepare_query

class AareguruPrepareQuery
{
    public static function call(AareguruContext $ctx): array
    {
        $point = $ctx->point;
        $reqmatch = $ctx->reqmatch ?? [];
        $params = [];
        if ($point) {
            $p = \Voxgig\Struct\Struct::getprop($point, 'params');
            if (is_array($p)) {
                $params = $p;
            }
            // A path parameter travels in the path. The generated config lists
            // them as args.params, which prepareParams reads; params is the
            // older list of names.
            $pl = \Voxgig\Struct\Struct::getpath($point, 'args.params');
            if (is_array($pl)) {
                foreach ($pl as $pd) {
                    $name = \Voxgig\Struct\Struct::getprop($pd, 'name');
                    if (is_string($name)) {
                        $params[] = $name;
                    }
                }
            }
            // A header parameter travels in the headers, which prepareHeaders
            // fills.
            $hl = \Voxgig\Struct\Struct::getpath($point, 'args.header');
            if (is_array($hl)) {
                foreach ($hl as $hd) {
                    $name = \Voxgig\Struct\Struct::getprop($hd, 'name');
                    if (is_string($name)) {
                        $params[] = $name;
                    }
                }
            }
        }
        // A query parameter travels under the name the definition gives it,
        // its orig, which the model may have renamed for the caller.
        $wire = [];
        if ($point) {
            $ql = \Voxgig\Struct\Struct::getpath($point, 'args.query');
            if (is_array($ql)) {
                foreach ($ql as $qd) {
                    $name = \Voxgig\Struct\Struct::getprop($qd, 'name');
                    $orig = \Voxgig\Struct\Struct::getprop($qd, 'orig');
                    if (is_string($name) && is_string($orig) && '' !== $orig) {
                        $wire[$name] = $orig;
                    }
                }
            }
        }
        $out = [];
        $items = \Voxgig\Struct\Struct::items($reqmatch);
        if ($items) {
            foreach ($items as $item) {
                $key = $item[0];
                $val = $item[1];
                if ($val !== null && is_string($key) && '$action' !== $key && !in_array($key, $params, true)) {
                    $out[$wire[$key] ?? $key] = $val;
                }
            }
        }
        return $out;
    }
}
