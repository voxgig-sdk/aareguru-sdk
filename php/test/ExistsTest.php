<?php
declare(strict_types=1);

// Aareguru SDK exists test

require_once __DIR__ . '/../aareguru_sdk.php';

use PHPUnit\Framework\TestCase;

class ExistsTest extends TestCase
{
    public function test_create_test_sdk(): void
    {
        $testsdk = AareguruSDK::test(null, null);
        $this->assertNotNull($testsdk);
    }
}
