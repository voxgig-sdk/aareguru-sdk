<?php
declare(strict_types=1);

// Aareguru SDK utility: make_spec

require_once __DIR__ . '/Graphql.php';
require_once __DIR__ . '/PrepareMethod.php';

require_once __DIR__ . '/../core/Spec.php';

class AareguruMakeSpec
{
    public static function call(AareguruContext $ctx): array
    {
        if (isset($ctx->out['spec'])) {
            // A PreSpec hook (validate) rejects the operation by placing its
            // error here; the pipeline raises it, and ctx->spec stays a spec.
            if ($ctx->out['spec'] instanceof \Throwable) {
                return [null, $ctx->out['spec']];
            }
            $ctx->spec = $ctx->out['spec'];
            return [$ctx->spec, null];
        }

        $point = $ctx->point;
        $options = $ctx->options;
        $utility = $ctx->utility;

        $base = \Voxgig\Struct\Struct::getprop($options, 'base') ?? '';
        $prefix = \Voxgig\Struct\Struct::getprop($options, 'prefix') ?? '';
        $suffix = \Voxgig\Struct\Struct::getprop($options, 'suffix') ?? '';

        $parts = [];
        if ($point) {
            $p = \Voxgig\Struct\Struct::getprop($point, 'parts');
            if (is_array($p)) {
                $parts = $p;
            }
        }

        $ctx->spec = new AareguruSpec([
            'base' => $base, 'prefix' => $prefix, 'parts' => $parts,
            'suffix' => $suffix, 'step' => 'start',
        ]);

        // prepare_method answers null for an op name outside the convention
        // (mirrors the ts reference, where methodMap[key] is undefined) -
        // which then fails the allow check below, never a TypeError and
        // never a silently-allowed empty method.
        $method = ($utility->prepare_method)($ctx);

        $allow_method = \Voxgig\Struct\Struct::getpath($options, 'allow.method');
        if (!AareguruPrepareMethod::allowed($allow_method, $method)) {
            $shown = is_string($method) ? $method : '';
            $list = is_string($allow_method) ? $allow_method : '';
            return [null, $ctx->make_error('spec_method_allow',
                "Method \"{$shown}\" not allowed by SDK option allow.method value: \"{$list}\"")];
        }
        $ctx->spec->method = $method;

        $ctx->spec->params = ($utility->prepare_params)($ctx);
        $ctx->spec->query = ($utility->prepare_query)($ctx);
        $ctx->spec->headers = ($utility->prepare_headers)($ctx);

        if ('graphql' === \Voxgig\Struct\Struct::getprop($point, 'kind')) {
            // GraphQL addresses one endpoint: no path parts, no query
            // string, and the body carries the operation. prepare_body is
            // skipped deliberately — it only emits a body for data-input
            // ops, whereas every GraphQL op posts one, including
            // load/list/remove.
            $ctx->spec->body = ($utility->graphql_body)($ctx);
            $ctx->spec->path = '';
            // prepare_query already copied the op's match arguments into
            // the query string. Those same values are bound as operation
            // variables, so leaving them would send /graphql?id=i1.
            $ctx->spec->query = [];
            $ctx->spec->headers['content-type'] = AareguruGraphql::CONTENT_TYPE;
        } else {
            $ctx->spec->body = ($utility->prepare_body)($ctx);
            $ctx->spec->path = ($utility->prepare_path)($ctx);
        }

        if ($ctx->ctrl->explain) {
            $ctx->ctrl->explain['spec'] = $ctx->spec;
        }

        // Whatever prepare_auth sets in the query, under whichever name, is
        // the credential; a key it leaves as it was is the caller's.
        $query = $ctx->spec->query;

        [$spec, $err] = ($utility->prepare_auth)($ctx);
        if ($err) {
            return [null, $err];
        }

        $spec->authquery = [];
        foreach ($spec->query as $key => $val) {
            if (!array_key_exists($key, $query) || $query[$key] !== $val) {
                $spec->authquery[] = $key;
            }
        }

        $ctx->spec = $spec;
        return [$spec, null];
    }
}
