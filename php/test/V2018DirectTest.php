<?php
declare(strict_types=1);

// V2018 direct test

require_once __DIR__ . '/../aareguru_sdk.php';
require_once __DIR__ . '/Runner.php';

use PHPUnit\Framework\TestCase;

class V2018DirectTest extends TestCase
{
    public function test_direct_load_v2018(): void
    {
        $setup = v2018_direct_setup(["id" => "direct01"]);
        $client = $setup["client"];


        [$result, $err] = $client->direct([
            "path" => "v2018/history",
            "method" => "GET",
            "params" => [],
        ]);
        $this->assertNull($err);
        $this->assertTrue($result["ok"]);
        $this->assertEquals(200, Helpers::to_int($result["status"]));
        $this->assertNotNull($result["data"]);

        if (!$setup["live"]) {
            if (is_array($result["data"]) && isset($result["data"]["id"])) {
                $this->assertEquals("direct01", $result["data"]["id"]);
            }
            $this->assertCount(1, $setup["calls"]);
        }
    }

}


function v2018_direct_setup($mockres)
{
    Runner::load_env_local();

    $calls = new \ArrayObject();

    $env = Runner::env_override([
        "AAREGURU_TEST_V_____ENTID" => [],
        "AAREGURU_TEST_LIVE" => "FALSE",
        "AAREGURU_APIKEY" => "NONE",
    ]);

    $live = $env["AAREGURU_TEST_LIVE"] === "TRUE";

    if ($live) {
        $merged_opts = [
            "apikey" => $env["AAREGURU_APIKEY"],
        ];
        $client = new AareguruSDK($merged_opts);
        return [
            "client" => $client,
            "calls" => $calls,
            "live" => true,
            "idmap" => [],
        ];
    }

    $mock_fetch = function ($url, $init) use ($calls, $mockres) {
        $calls[] = ["url" => $url, "init" => $init];
        return [
            [
                "status" => 200,
                "statusText" => "OK",
                "headers" => [],
                "json" => function () use ($mockres) {
                    if ($mockres !== null) {
                        return $mockres;
                    }
                    return ["id" => "direct01"];
                },
                "body" => "mock",
            ],
            null,
        ];
    };

    $client = new AareguruSDK([
        "base" => "http://localhost:8080",
        "system" => [
            "fetch" => $mock_fetch,
        ],
    ]);

    return [
        "client" => $client,
        "calls" => $calls,
        "live" => false,
        "idmap" => [],
    ];
}
