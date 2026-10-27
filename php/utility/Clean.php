<?php
declare(strict_types=1);

// Aareguru SDK utility: clean

// Everything that leaves the pipeline passes through clean: the error, the
// explain record, the printed context, and whatever a feature emits. Two
// layers: every registered secret VALUE (and its encoded forms) is replaced
// wherever it appears in a string, and every value under a sensitive KEY
// name is masked whatever it holds. Inside the pipeline data stays raw, so a
// hook can still read the header it must add to. Mirrors
// tm/ts/src/utility/CleanUtility.ts.
class AareguruClean
{
    private const MAXDEPTH = 32;
    private const CIRCULAR = '[circular]';

    // Clean a value on its way out. A string is redacted; a Throwable is
    // redacted IN PLACE (it is about to be thrown, and its identity matters
    // to the caller); anything else comes back as a masked plain-data copy.
    public static function call(?AareguruContext $ctx, mixed $val): mixed
    {
        $cfg = self::config_of($ctx);

        if (false === $cfg->active) {
            return $val;
        }

        if (is_string($val)) {
            return self::clean_string($cfg, $val);
        }

        if ($val instanceof \Throwable) {
            self::clean_throwable($cfg, $val);
            return $val;
        }

        $seen = [];
        return self::snapshot($cfg, $val, null, 0, $seen);
    }

    // Register a secret value (clean_add). Idempotent; shorter than `min` is
    // not a secret the SDK can mask without blanking ordinary text.
    public static function add(?AareguruContext $ctx, mixed $value): void
    {
        $cfg = self::config_of($ctx);
        if (!is_string($value) || strlen($value) < $cfg->min) {
            return;
        }
        $changed = false;
        foreach (self::forms($value) as $form) {
            if (strlen($form) >= $cfg->min && !in_array($form, $cfg->values, true)) {
                $cfg->values[] = $form;
                $changed = true;
            }
        }
        if ($changed) {
            usort($cfg->values, function (string $a, string $b): int {
                return strlen($b) - strlen($a);
            });
        }
    }

    // Every scalar under a sensitive name, at any depth and of any shape: a
    // credential mistyped as a map or a number is still a credential, and
    // the validation error that rejects it quotes it.
    public static function add_sensitive(?AareguruContext $ctx, mixed $val): void
    {
        $seen = [];
        self::walk_sensitive($ctx, $val, false, 0, $seen);
    }

    private static function walk_sensitive(
        ?AareguruContext $ctx, mixed $val, bool $under, int $depth, array &$seen
    ): void {
        if (null === $val || self::MAXDEPTH <= $depth || $val instanceof \Closure) {
            return;
        }
        if (is_string($val) || is_int($val) || is_float($val)) {
            if ($under) {
                self::add($ctx, (string)$val);
            }
            return;
        }
        if (is_object($val)) {
            $id = spl_object_id($val);
            if (in_array($id, $seen, true)) {
                return;
            }
            $seen[] = $id;
            $val = get_object_vars($val);
        }
        if (is_array($val)) {
            foreach ($val as $k => $v) {
                self::walk_sensitive($ctx, $v, $under || self::key($ctx, $k), $depth + 1, $seen);
            }
        }
    }

    // A feature's name is not a field name: only the sensitive names inside
    // its settings count, so `secrets` does not make every setting a secret.
    // Entity blocks (per-entity settings, seeded records) hold no credential,
    // and nor do rbac's rules, keyed by entity and operation names.
    public static function add_options(?AareguruContext $ctx, array $opts): void
    {
        $feature = $opts['feature'] ?? null;
        unset($opts['feature'], $opts['entity']);
        if (array_key_exists('test', $opts)) {
            $opts['test'] = self::plain_settings($opts['test'], null);
        }
        self::add_sensitive($ctx, $opts);
        $feature = is_object($feature) ? get_object_vars($feature) : $feature;
        foreach (is_array($feature) ? $feature : [$feature] as $fname => $fopts) {
            self::add_sensitive($ctx, self::plain_settings($fopts, is_string($fname) ? $fname : null));
        }
    }

    private static function plain_settings(mixed $block, ?string $name): mixed
    {
        $block = is_object($block) ? get_object_vars($block) : $block;
        if (is_array($block)) {
            $name ??= is_string($block['name'] ?? null) ? $block['name'] : null;
            unset($block['entity']);
            if ('rbac' === $name) {
                unset($block['rules']);
            }
        }
        return $block;
    }

    // Is this key name sensitive under the context's clean configuration?
    public static function key(?AareguruContext $ctx, mixed $key): bool
    {
        return self::sensitive_key(self::config_of($ctx), $key);
    }

    // The derived clean block make_options builds from the option spec. An
    // OBJECT, deliberately: every context copies the options array, and the
    // registry must be one shared, mutable thing for a feature to add to
    // after construction.
    public static function config(mixed $cleanopts): \stdClass
    {
        $opts = is_object($cleanopts) ? get_object_vars($cleanopts)
            : (is_array($cleanopts) ? $cleanopts : []);
        return (object)[
            'active' => ($opts['active'] ?? null) !== false,
            'keys' => self::splitkeys($opts['keys'] ?? null),
            'values' => [],
            'mask' => is_string($opts['mask'] ?? null) ? $opts['mask'] : '[redacted]',
            'hint' => self::count($opts['hint'] ?? null, 0),
            'min' => max(1, self::count($opts['min'] ?? null, 4)),
        ];
    }

    // The comma-separated literal values a caller registers; a list is taken
    // as-is for a caller that has one.
    public static function splitvalues(mixed $values): array
    {
        if (is_array($values)) {
            return array_values(array_filter($values, 'is_string'));
        }
        $parts = preg_split('/\s*,\s*/', null === $values ? '' : (string)$values) ?: [];
        return array_values(array_filter($parts, function (string $v): bool {
            return '' !== $v;
        }));
    }

    // A context without options (make_error is reached with a bare one)
    // falls back to the schema defaults, so nothing leaves raw for want of a
    // constructor.
    private static function config_of(?AareguruContext $ctx): \stdClass
    {
        $derived = null;
        if (null !== $ctx && is_array($ctx->options)) {
            $derived = $ctx->options['__derived__']['clean'] ?? null;
        }
        if ($derived instanceof \stdClass) {
            return $derived;
        }
        if (is_array($derived)) {
            return (object)$derived;
        }
        require_once __DIR__ . '/../schema.php';
        return self::config(\Voxgig\Struct\Struct::getprop(AareguruSchema::optspec(), 'clean'));
    }

    private static function normkey(mixed $key): string
    {
        return str_replace(['-', '_'], '', strtolower((string)$key));
    }

    private static function splitkeys(mixed $keys): array
    {
        $parts = preg_split('/\s*,\s*/', null === $keys ? '' : (string)$keys) ?: [];
        $out = [];
        foreach ($parts as $part) {
            $nk = self::normkey($part);
            if ('' !== $nk) {
                $out[] = $nk;
            }
        }
        return $out;
    }

    // The spec carries numbers as strings, so every target reads it alike.
    private static function count(mixed $val, int $dflt): int
    {
        if (!is_numeric($val)) {
            return $dflt;
        }
        $n = (int)floor((float)$val);
        return 0 <= $n ? $n : $dflt;
    }

    // The encoded forms a value travels in: Basic and Bearer both carry
    // base64, a query credential is percent-encoded, and a JSON dump escapes
    // it.
    private static function forms(string $value): array
    {
        $out = [$value];
        $add = function (mixed $s) use (&$out): void {
            if (is_string($s) && '' !== $s && !in_array($s, $out, true)) {
                $out[] = $s;
            }
        };
        $add(base64_encode($value));
        $add(rawurlencode($value));
        $json = json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if (is_string($json)) {
            $add(substr($json, 1, -1));
        }
        return $out;
    }

    private static function mask_value(\stdClass $cfg, string $value): string
    {
        if (0 < $cfg->hint && strlen($value) > 2 * $cfg->hint) {
            return $cfg->mask . substr($value, -$cfg->hint);
        }
        return $cfg->mask;
    }

    private static function clean_string(\stdClass $cfg, string $text): string
    {
        $out = $text;
        foreach ($cfg->values as $value) {
            if (is_string($value) && '' !== $value && str_contains($out, $value)) {
                $out = str_replace($value, self::mask_value($cfg, $value), $out);
            }
        }
        return $out;
    }

    private static function sensitive_key(\stdClass $cfg, mixed $key): bool
    {
        if (null === $key || is_int($key)) {
            return false;
        }
        $nk = self::normkey($key);
        foreach ($cfg->keys as $k) {
            if (str_contains($nk, $k)) {
                return true;
            }
        }
        return false;
    }

    // A plain-data copy of what is about to leave: jsonSerialize is honoured
    // (a context serialises as its record), closures are dropped, cycles are
    // cut, and no live object is shared with the copy - masking the copy
    // must never mask the pipeline's own spec.
    private static function snapshot(\stdClass $cfg, mixed $val, mixed $key, int $depth, array &$seen): mixed
    {
        if (null === $val) {
            return null;
        }

        if (is_string($val)) {
            return self::sensitive_key($cfg, $key)
                ? self::mask_value($cfg, $val) : self::clean_string($cfg, $val);
        }

        if ($val instanceof \Closure) {
            return null;
        }

        if (!is_array($val) && !is_object($val)) {
            return self::sensitive_key($cfg, $key) ? $cfg->mask : $val;
        }

        if (self::MAXDEPTH <= $depth) {
            return self::CIRCULAR;
        }

        if (self::sensitive_key($cfg, $key)) {
            return $cfg->mask;
        }

        if (is_array($val)) {
            return self::plain($cfg, $val, $depth, $seen);
        }

        $id = spl_object_id($val);
        if (in_array($id, $seen, true)) {
            return self::CIRCULAR;
        }

        $seen[] = $id;
        try {
            if ($val instanceof \Throwable) {
                $out = [
                    'message' => self::clean_string($cfg, $val->getMessage()),
                    'stack' => self::clean_string($cfg, $val->getTraceAsString()),
                ];
                foreach (get_object_vars($val) as $k => $v) {
                    if (!($v instanceof \Closure)) {
                        $out[self::clean_name($cfg, $out, $k)] = self::snapshot($cfg, $v, $k, $depth + 1, $seen);
                    }
                }
                return $out;
            }

            if ($val instanceof \JsonSerializable) {
                $json = $val->jsonSerialize();
                return $json === $val
                    ? self::plain($cfg, get_object_vars($val), $depth, $seen)
                    : self::snapshot($cfg, $json, $key, $depth + 1, $seen);
            }

            return self::plain($cfg, get_object_vars($val), $depth, $seen);
        } finally {
            array_pop($seen);
        }
    }

    private static function plain(\stdClass $cfg, array $val, int $depth, array &$seen): array
    {
        $out = [];
        foreach ($val as $k => $v) {
            if (!($v instanceof \Closure)) {
                $out[self::clean_name($cfg, $out, $k)] = self::snapshot($cfg, $v, $k, $depth + 1, $seen);
            }
        }
        return $out;
    }

    // A registered value used as a property name is masked like any other
    // string; names that mask alike take a counter, so none is lost.
    private static function clean_name(\stdClass $cfg, array|object $out, int|string $key): int|string
    {
        if (!is_string($key)) {
            return $key;
        }
        $name = self::clean_string($cfg, $key);
        $has = fn (string $n): bool => is_array($out) ? array_key_exists($n, $out) : property_exists($out, $n);
        if ($name === $key || !$has($name)) {
            return $name;
        }
        $i = 1;
        while ($has($name . '#' . $i)) {
            $i++;
        }
        return $name . '#' . $i;
    }

    // In place: the message, the public fields, and the trace arguments,
    // which hold every context the failing frames were handed. The previous
    // chain too, since var_export walks it.
    private static function clean_throwable(\stdClass $cfg, \Throwable $top): void
    {
        $seen = [];
        for ($err = $top; null !== $err && !in_array(spl_object_id($err), $seen, true);
             $err = $err->getPrevious()) {
            $seen[] = spl_object_id($err);
            self::clean_one($cfg, $err);
        }
    }

    private static function clean_one(\stdClass $cfg, \Throwable $err): void
    {
        $msg = self::clean_string($cfg, $err->getMessage());
        if ($msg !== $err->getMessage()) {
            self::rewrite($err, 'message', $msg);
        }

        // print_r and var_export show the protected code, a string for some
        // drivers.
        $code = $err->getCode();
        $cleancode = is_string($code) ? self::clean_string($cfg, $code) : $code;
        if ($cleancode !== $code) {
            self::rewrite($err, 'code', $cleancode);
        }

        // The base __toString caches its text, raw message and all.
        if ('' !== self::read($err, 'string')) {
            self::rewrite($err, 'string', '');
        }

        $trace = $err->getTrace();
        $stripped = false;
        foreach ($trace as $i => $frame) {
            if (is_array($frame) && array_key_exists('args', $frame)) {
                unset($trace[$i]['args']);
                $stripped = true;
            }
        }
        if ($stripped) {
            self::rewrite($err, 'trace', $trace);
        }

        foreach (get_object_vars($err) as $k => $raw) {
            $v = $raw;
            if (is_string($v)) {
                $v = self::sensitive_key($cfg, $k)
                    ? self::mask_value($cfg, $v) : self::clean_string($cfg, $v);
            } elseif ((is_array($v) || is_object($v)) && !($v instanceof \Closure)) {
                $seen = [];
                $v = self::snapshot($cfg, $v, $k, 1, $seen);
            }
            $name = is_string($k) ? self::clean_string($cfg, $k) : $k;
            if ($name === $k) {
                if ($v !== $raw) {
                    $err->$k = $v;
                }
                continue;
            }
            // Only a dynamic property can carry a secret name. Re-adding it
            // may raise a deprecation a handler turns into an exception; the
            // raw name is gone either way.
            unset($err->$k);
            try {
                $err->{self::clean_name($cfg, $err, $k)} = $v;
            } catch (\Throwable $_e) {
            }
        }
    }

    private static function read(\Throwable $err, string $prop): mixed
    {
        $owner = $err instanceof \Exception ? \Exception::class : \Error::class;
        return (new \ReflectionProperty($owner, $prop))->getValue($err);
    }

    // Exception::$message and ::$trace cannot be assigned from outside, and
    // a closure cannot be bound to an internal class, so reflection is the
    // one door to cleaning a thrown error in place.
    private static function rewrite(\Throwable $err, string $prop, mixed $value): void
    {
        $owner = $err instanceof \Exception ? \Exception::class : \Error::class;
        $rp = new \ReflectionProperty($owner, $prop);
        $rp->setValue($err, $value);
    }
}
