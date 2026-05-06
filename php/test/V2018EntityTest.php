<?php
declare(strict_types=1);

// V2018 entity test

require_once __DIR__ . '/../aareguru_sdk.php';
require_once __DIR__ . '/Runner.php';

use PHPUnit\Framework\TestCase;
use Voxgig\Struct\Struct as Vs;

class V2018EntityTest extends TestCase
{
    public function test_create_instance(): void
    {
        $testsdk = AareguruSDK::test(null, null);
        $ent = $testsdk->V2018(null);
        $this->assertNotNull($ent);
    }

    public function test_basic_flow(): void
    {
        $setup = v2018_basic_setup(null);
        $client = $setup["client"];

        // Bootstrap entity data from existing test data.
        $v2018_ref01_data_raw = Vs::items(Helpers::to_map(
            Vs::getpath($setup["data"], "existing.v2018")));
        $v2018_ref01_data = null;
        if (count($v2018_ref01_data_raw) > 0) {
            $v2018_ref01_data = Helpers::to_map($v2018_ref01_data_raw[0][1]);
        }

        // LOAD
        $v2018_ref01_ent = $client->V2018(null);
        $v2018_ref01_match_dt0 = [
            "id" => $v2018_ref01_data["id"],
        ];
        [$v2018_ref01_data_dt0_loaded, $err] = $v2018_ref01_ent->load($v2018_ref01_match_dt0, null);
        $this->assertNull($err);
        $v2018_ref01_data_dt0_load_result = Helpers::to_map($v2018_ref01_data_dt0_loaded);
        $this->assertNotNull($v2018_ref01_data_dt0_load_result);
        $this->assertEquals($v2018_ref01_data_dt0_load_result["id"], $v2018_ref01_data["id"]);

    }
}

function v2018_basic_setup($extra)
{
    Runner::load_env_local();

    $entity_data_file = __DIR__ . '/../../.sdk/test/entity/v2018/V2018TestData.json';
    $entity_data_source = file_get_contents($entity_data_file);
    $entity_data = json_decode($entity_data_source, true);

    $options = [];
    $options["entity"] = $entity_data["existing"];

    $client = AareguruSDK::test($options, $extra);

    // Generate idmap.
    $idmap = [];
    foreach (["v201801", "v201802", "v201803"] as $k) {
        $idmap[$k] = strtoupper($k);
    }

    $env = Runner::env_override([
        "AAREGURU_TEST_V_____ENTID" => $idmap,
        "AAREGURU_TEST_LIVE" => "FALSE",
        "AAREGURU_TEST_EXPLAIN" => "FALSE",
        "AAREGURU_APIKEY" => "NONE",
    ]);

    $idmap_resolved = Helpers::to_map(
        $env["AAREGURU_TEST_V_____ENTID"]);
    if ($idmap_resolved === null) {
        $idmap_resolved = Helpers::to_map($idmap);
    }

    if ($env["AAREGURU_TEST_LIVE"] === "TRUE") {
        $merged_opts = Vs::merge([
            [
                "apikey" => $env["AAREGURU_APIKEY"],
            ],
            $extra ?? [],
        ]);
        $client = new AareguruSDK(Helpers::to_map($merged_opts));
    }

    return [
        "client" => $client,
        "data" => $entity_data,
        "idmap" => $idmap_resolved,
        "env" => $env,
        "explain" => $env["AAREGURU_TEST_EXPLAIN"] === "TRUE",
        "now" => (int)(microtime(true) * 1000),
    ];
}
