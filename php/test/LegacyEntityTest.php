<?php
declare(strict_types=1);

// Legacy entity test

require_once __DIR__ . '/../aareguru_sdk.php';
require_once __DIR__ . '/Runner.php';

use PHPUnit\Framework\TestCase;
use Voxgig\Struct\Struct as Vs;

class LegacyEntityTest extends TestCase
{
    public function test_create_instance(): void
    {
        $testsdk = AareguruSDK::test(null, null);
        $ent = $testsdk->Legacy(null);
        $this->assertNotNull($ent);
    }

    public function test_basic_flow(): void
    {
        $setup = legacy_basic_setup(null);
        $client = $setup["client"];

        // Bootstrap entity data from existing test data.
        $legacy_ref01_data_raw = Vs::items(Helpers::to_map(
            Vs::getpath($setup["data"], "existing.legacy")));
        $legacy_ref01_data = null;
        if (count($legacy_ref01_data_raw) > 0) {
            $legacy_ref01_data = Helpers::to_map($legacy_ref01_data_raw[0][1]);
        }

        // LOAD
        $legacy_ref01_ent = $client->Legacy(null);
        $legacy_ref01_match_dt0 = [
            "id" => $legacy_ref01_data["id"],
        ];
        [$legacy_ref01_data_dt0_loaded, $err] = $legacy_ref01_ent->load($legacy_ref01_match_dt0, null);
        $this->assertNull($err);
        $legacy_ref01_data_dt0_load_result = Helpers::to_map($legacy_ref01_data_dt0_loaded);
        $this->assertNotNull($legacy_ref01_data_dt0_load_result);
        $this->assertEquals($legacy_ref01_data_dt0_load_result["id"], $legacy_ref01_data["id"]);

    }
}

function legacy_basic_setup($extra)
{
    Runner::load_env_local();

    $entity_data_file = __DIR__ . '/../../.sdk/test/entity/legacy/LegacyTestData.json';
    $entity_data_source = file_get_contents($entity_data_file);
    $entity_data = json_decode($entity_data_source, true);

    $options = [];
    $options["entity"] = $entity_data["existing"];

    $client = AareguruSDK::test($options, $extra);

    // Generate idmap.
    $idmap = [];
    foreach (["legacy01", "legacy02", "legacy03"] as $k) {
        $idmap[$k] = strtoupper($k);
    }

    $env = Runner::env_override([
        "AAREGURU_TEST_LEGACY_ENTID" => $idmap,
        "AAREGURU_TEST_LIVE" => "FALSE",
        "AAREGURU_TEST_EXPLAIN" => "FALSE",
        "AAREGURU_APIKEY" => "NONE",
    ]);

    $idmap_resolved = Helpers::to_map(
        $env["AAREGURU_TEST_LEGACY_ENTID"]);
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
