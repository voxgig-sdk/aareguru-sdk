<?php
declare(strict_types=1);

// Aareguru SDK test feature

require_once __DIR__ . '/BaseFeature.php';

class AareguruTestFeature extends AareguruBaseFeature
{
    private mixed $client;
    private ?array $options;

    public function __construct()
    {
        parent::__construct();
        $this->version = '0.0.1';
        $this->name = 'test';
        $this->active = true;
        $this->client = null;
        $this->options = null;
    }

    public function init(AareguruContext $ctx, array $options): void
    {
        $this->client = $ctx->client;
        $this->options = $options;

        $entity_data = \Voxgig\Struct\Struct::getprop($options, 'entity');
        if (!is_array($entity_data)) {
            $entity_data = [];
        }

        $this->client->mode = 'test';

        // Ensure entity ids are correct.
        \Voxgig\Struct\Struct::walk($entity_data, function ($key, $val, $parent, $path) {
            if (count($path) === 2 && is_array($val) && $key !== null) {
                $val['id'] = $key;
            }
            return $val;
        });

        // Wrap in object so closure mutations persist (PHP arrays are value types).
        $entity = new \stdClass();
        $entity->data = $entity_data;

        $test_fetcher = function (AareguruContext $fctx, string $_fullurl, array $_fetchdef) use ($entity): array {
            $respond = function (int $status, mixed $data, ?array $extra): array {
                $out = [
                    'status' => $status,
                    'statusText' => 'OK',
                    'json' => function () use ($data) { return $data; },
                    'body' => 'not-used',
                ];
                if ($extra) {
                    foreach ($extra as $k => $v) {
                        $out[$k] = $v;
                    }
                }
                return [$out, null];
            };

            $op = $fctx->op;
            $entname = $op->entity;
            $entmap = is_array($entity->data[$entname] ?? null) ? $entity->data[$entname] : [];

            // Extract id from context: reqmatch for load/remove, reqdata for update/create.
            $get_id = function () use ($fctx) {
                $sources = [$fctx->reqmatch, $fctx->reqdata, $fctx->data];
                foreach ($sources as $src) {
                    if (is_array($src) && isset($src['id']) && $src['id'] !== '__UNDEFINED__') {
                        return $src['id'];
                    }
                }
                return null;
            };

            if ($op->name === 'load') {
                $id = $get_id();
                $ent = ($id !== null && isset($entmap[$id])) ? $entmap[$id] : null;
                if (!$ent) {
                    // Fallback: search by id field value
                    foreach ($entmap as $e) {
                        if (is_array($e) && ($e['id'] ?? null) === $id) { $ent = $e; break; }
                    }
                }
                if (!$ent) {
                    return $respond(404, null, ['statusText' => 'Not found']);
                }
                $out = \Voxgig\Struct\Struct::clone($ent);
                if (is_array($out)) { unset($out['$KEY']); }
                return $respond(200, $out, null);

            } elseif ($op->name === 'list') {
                $out = [];
                foreach ($entmap as $e) {
                    if (is_array($e)) {
                        $copy = $e;
                        unset($copy['$KEY']);
                        $out[] = $copy;
                    }
                }
                return $respond(200, $out, null);

            } elseif ($op->name === 'update') {
                $id = $get_id();
                $ent = ($id !== null && isset($entmap[$id])) ? $entmap[$id] : null;
                if (!$ent) {
                    foreach ($entmap as $e) {
                        if (is_array($e) && ($e['id'] ?? null) === $id) { $ent = $e; break; }
                    }
                }
                if (!$ent) {
                    return $respond(404, null, ['statusText' => 'Not found']);
                }
                if (is_array($fctx->reqdata)) {
                    foreach ($fctx->reqdata as $k => $v) {
                        $ent[$k] = $v;
                    }
                }
                $entmap[$id] = $ent;
                $entity->data[$entname] = $entmap;
                $out = \Voxgig\Struct\Struct::clone($ent);
                if (is_array($out)) { unset($out['$KEY']); }
                return $respond(200, $out, null);

            } elseif ($op->name === 'remove') {
                $id = $get_id();
                if ($id !== null && isset($entmap[$id])) {
                    unset($entmap[$id]);
                    $entity->data[$entname] = $entmap;
                }
                return $respond(200, null, null);

            } elseif ($op->name === 'create') {
                $id = $get_id();
                if ($id === null) {
                    $id = sprintf('%04x%04x%04x%04x', random_int(0, 0xFFFF), random_int(0, 0xFFFF), random_int(0, 0xFFFF), random_int(0, 0xFFFF));
                }

                $ent = is_array($fctx->reqdata) ? $fctx->reqdata : [];
                $ent['id'] = $id;
                $entmap[$id] = $ent;
                $entity->data[$entname] = $entmap;
                $out = \Voxgig\Struct\Struct::clone($ent);
                if (is_array($out)) { unset($out['$KEY']); }
                return $respond(200, $out, null);

            } else {
                return $respond(404, null, ['statusText' => 'Unknown operation']);
            }
        };

        $ctx->utility->fetcher = $test_fetcher;
    }
}
