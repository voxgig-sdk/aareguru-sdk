<?php
declare(strict_types=1);

// Aareguru SDK utility: feature_add

class AareguruFeatureAdd
{
    public static function call(AareguruContext $ctx, mixed $f): void
    {
        $ctx->client->features[] = $f;
    }
}
