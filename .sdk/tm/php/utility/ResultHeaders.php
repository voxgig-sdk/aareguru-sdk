<?php
declare(strict_types=1);

// Aareguru SDK utility: result_headers

class AareguruResultHeaders
{
    public static function call(AareguruContext $ctx): ?AareguruResult
    {
        $response = $ctx->response;
        $result = $ctx->result;
        if ($result) {
            if ($response && is_array($response->headers)) {
                $result->headers = $response->headers;
            } else {
                $result->headers = [];
            }
        }
        return $result;
    }
}
