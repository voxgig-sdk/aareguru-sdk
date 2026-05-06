<?php
declare(strict_types=1);

// Aareguru SDK utility: prepare_body

class AareguruPrepareBody
{
    public static function call(AareguruContext $ctx): mixed
    {
        if ($ctx->op->input === 'data') {
            return ($ctx->utility->transform_request)($ctx);
        }
        return null;
    }
}
