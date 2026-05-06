<?php
declare(strict_types=1);

// Aareguru SDK utility: make_context

require_once __DIR__ . '/../core/Context.php';

class AareguruMakeContext
{
    public static function call(array $ctxmap, ?AareguruContext $basectx): AareguruContext
    {
        return new AareguruContext($ctxmap, $basectx);
    }
}
