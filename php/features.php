<?php
declare(strict_types=1);

// Aareguru SDK feature factory

require_once __DIR__ . '/feature/BaseFeature.php';
require_once __DIR__ . '/feature/TestFeature.php';


class AareguruFeatures
{
    public static function make_feature(string $name)
    {
        switch ($name) {
            case "base":
                return new AareguruBaseFeature();
            case "test":
                return new AareguruTestFeature();
            default:
                return new AareguruBaseFeature();
        }
    }
}
