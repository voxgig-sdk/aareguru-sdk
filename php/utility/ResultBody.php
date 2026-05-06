<?php
declare(strict_types=1);

// Aareguru SDK utility: result_body

class AareguruResultBody
{
    public static function call(AareguruContext $ctx): ?AareguruResult
    {
        $response = $ctx->response;
        $result = $ctx->result;
        if ($result && $response && $response->json_func && $response->body) {
            $result->body = ($response->json_func)();
        }
        return $result;
    }
}
