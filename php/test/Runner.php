<?php
declare(strict_types=1);

// Aareguru SDK test runner

class AareguruTestRunner
{
    private static array $env = [];

    public static function load_env_local(): void
    {
        $env_file = __DIR__ . '/../../.env.local';
        if (!file_exists($env_file)) {
            return;
        }

        $lines = file($env_file, FILE_IGNORE_NEW_LINES);
        if ($lines === false) {
            return;
        }

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }
            $parts = explode('=', $line, 2);
            if (count($parts) !== 2) {
                continue;
            }
            self::$env[trim($parts[0])] = trim($parts[1]);
        }
    }

    public static function getenv(string $key): ?string
    {
        if (isset(self::$env[$key])) {
            return self::$env[$key];
        }
        $val = \getenv($key);
        return $val !== false ? $val : null;
    }

    public static function env_override(array $m): array
    {
        $live = self::getenv('AAREGURU_TEST_LIVE');
        $override = self::getenv('AAREGURU_TEST_OVERRIDE');

        if ($live === 'TRUE' || $override === 'TRUE') {
            foreach (array_keys($m) as $key) {
                $envval = self::getenv($key);
                if ($envval !== null && $envval !== '') {
                    $envval = trim($envval);
                    if (str_starts_with($envval, '{')) {
                        $parsed = json_decode($envval, true);
                        if (json_last_error() === JSON_ERROR_NONE) {
                            $m[$key] = $parsed;
                            continue;
                        }
                    }
                    $m[$key] = $envval;
                }
            }
        }

        $explain = self::getenv('AAREGURU_TEST_EXPLAIN');
        if ($explain !== null && $explain !== '') {
            $m['AAREGURU_TEST_EXPLAIN'] = $explain;
        }

        return $m;
    }

    public static function entity_list_to_data(array $list): array
    {
        $out = [];
        foreach ($list as $item) {
            if (is_array($item)) {
                $out[] = $item;
            } elseif (is_object($item) && method_exists($item, 'data_get')) {
                $d = $item->data_get();
                if (is_array($d)) {
                    $out[] = $d;
                }
            }
        }
        return $out;
    }
}

// Aliases for test convenience.
class_alias('AareguruTestRunner', 'Runner');
class_alias('AareguruHelpers', 'Helpers');
class_alias('Voxgig\Struct\Struct', 'Vs');

// Filter array of maps by matching key-value criteria.
function sdk_select(array $list, array $criteria): array
{
    $out = [];
    foreach ($list as $item) {
        if (!is_array($item)) continue;
        $match = true;
        foreach ($criteria as $k => $v) {
            if (!isset($item[$k]) || $item[$k] !== $v) {
                $match = false;
                break;
            }
        }
        if ($match) $out[] = $item;
    }
    return $out;
}
