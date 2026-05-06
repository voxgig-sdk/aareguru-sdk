# Legacy entity test

require "minitest/autorun"
require "json"
require_relative "../Aareguru_sdk"
require_relative "runner"

class LegacyEntityTest < Minitest::Test
  def test_create_instance
    testsdk = AareguruSDK.test(nil, nil)
    ent = testsdk.Legacy(nil)
    assert !ent.nil?
  end

  def test_basic_flow
    setup = legacy_basic_setup(nil)
    client = setup[:client]

    # Bootstrap entity data from existing test data.
    legacy_ref01_data_raw = Vs.items(Helpers.to_map(
      Vs.getpath(setup[:data], "existing.legacy")))
    legacy_ref01_data = nil
    if legacy_ref01_data_raw.length > 0
      legacy_ref01_data = Helpers.to_map(legacy_ref01_data_raw[0][1])
    end

    # LOAD
    legacy_ref01_ent = client.Legacy(nil)
    legacy_ref01_match_dt0 = {
      "id" => legacy_ref01_data["id"],
    }
    legacy_ref01_data_dt0_loaded, err = legacy_ref01_ent.load(legacy_ref01_match_dt0, nil)
    assert_nil err
    legacy_ref01_data_dt0_load_result = Helpers.to_map(legacy_ref01_data_dt0_loaded)
    assert !legacy_ref01_data_dt0_load_result.nil?
    assert_equal legacy_ref01_data_dt0_load_result["id"], legacy_ref01_data["id"]

  end
end

def legacy_basic_setup(extra)
  Runner.load_env_local

  entity_data_file = File.join(__dir__, "..", "..", ".sdk", "test", "entity", "legacy", "LegacyTestData.json")
  entity_data_source = File.read(entity_data_file)
  entity_data = JSON.parse(entity_data_source)

  options = {}
  options["entity"] = entity_data["existing"]

  client = AareguruSDK.test(options, extra)

  # Generate idmap via transform.
  idmap = Vs.transform(
    ["legacy01", "legacy02", "legacy03"],
    {
      "`$PACK`" => ["", {
        "`$KEY`" => "`$COPY`",
        "`$VAL`" => ["`$FORMAT`", "upper", "`$COPY`"],
      }],
    }
  )

  env = Runner.env_override({
    "AAREGURU_TEST_LEGACY_ENTID" => idmap,
    "AAREGURU_TEST_LIVE" => "FALSE",
    "AAREGURU_TEST_EXPLAIN" => "FALSE",
    "AAREGURU_APIKEY" => "NONE",
  })

  idmap_resolved = Helpers.to_map(
    env["AAREGURU_TEST_LEGACY_ENTID"])
  if idmap_resolved.nil?
    idmap_resolved = Helpers.to_map(idmap)
  end

  if env["AAREGURU_TEST_LIVE"] == "TRUE"
    merged_opts = Vs.merge([
      {
        "apikey" => env["AAREGURU_APIKEY"],
      },
      extra || {},
    ])
    client = AareguruSDK.new(Helpers.to_map(merged_opts))
  end

  {
    client: client,
    data: entity_data,
    idmap: idmap_resolved,
    env: env,
    explain: env["AAREGURU_TEST_EXPLAIN"] == "TRUE",
    now: (Time.now.to_f * 1000).to_i,
  }
end
