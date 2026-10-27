# Legacy entity test

require "minitest/autorun"
require "json"
require_relative "../Aareguru_sdk"
require_relative "runner"

class LegacyEntityTest < Minitest::Test
  # main.kit.test.live.strict is true (the default is true): a live
  # request that fails, or a live test missing an input it needs,
  # fails the test.
  # An account with no record for a test to read skips it either way.
  LIVE_STRICT = true

  def test_create_instance
    testsdk = AareguruSDK.test(nil, nil)
    ent = testsdk.Legacy(nil)
    assert !ent.nil?
  end

  def test_validate
    cfg = AareguruConfig.shared_config
    unless cfg["feature"].is_a?(Hash) && cfg["feature"].key?("validate")
      skip("feature not present in this SDK: validate")
    end
    client = AareguruSDK.test(nil, { "feature" => { "validate" => { "active" => true } } })
    err = assert_raises(StandardError) do
      client.Legacy(nil).load({ "app" => 1 }, nil)
    end
    assert_equal "validate_failed", err.code
  end

  def test_basic_flow
    setup = legacy_basic_setup(nil)
    # Per-op sdk-test-control.json skip.
    _live = setup[:live] || false
    ["load"].each do |_op|
      _should_skip, _reason = Runner.is_control_skipped("entityOp", "legacy." + _op, _live ? "live" : "unit")
      if _should_skip
        skip(_reason || "skipped via sdk-test-control.json")
        return
      end
    end
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
    legacy_ref01_match_dt0 = {}
    legacy_ref01_data_dt0_loaded = legacy_ref01_ent.load(legacy_ref01_match_dt0, nil)
    assert !legacy_ref01_data_dt0_loaded.nil?

  end
end

def legacy_basic_setup(extra)
  Runner.load_env_local

  entity_data_file = File.join(__dir__, "..", "..", ".sdk", "test", "entity", "legacy", "LegacyTestData.json")
  entity_data_source = File.read(entity_data_file, encoding: "UTF-8")
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

  # Whether *_ENTID supplied the idmap, read before env_override consumes
  # it: without it, the ids a live flow binds are the fixture's synthetic ones.
  entid_env_raw = ENV["AAREGURU_TEST_LEGACY_ENTID"]
  idmap_overridden = !entid_env_raw.nil? && entid_env_raw.strip.start_with?("{")

  env = Runner.env_override({
    "AAREGURU_TEST_LEGACY_ENTID" => idmap,
    "AAREGURU_TEST_LIVE" => "FALSE",
    "AAREGURU_TEST_EXPLAIN" => "FALSE",
  })

  idmap_resolved = Helpers.to_map(
    env["AAREGURU_TEST_LEGACY_ENTID"])
  if idmap_resolved.nil?
    idmap_resolved = Helpers.to_map(idmap)
  end

  if env["AAREGURU_TEST_LIVE"] == "TRUE"
    merged_opts = Vs.merge([
      # FIRST, so the generated fields below win: sdk-test-control.json's
      # test.client.options adds to the live client, it does not redirect it.
      Runner.live_client_options,
      {
      },
      extra || {},
    ])
    client = AareguruSDK.new(Helpers.to_map(merged_opts))
  end

  live = env["AAREGURU_TEST_LIVE"] == "TRUE"
  {
    client: client,
    data: entity_data,
    idmap: idmap_resolved,
    env: env,
    explain: env["AAREGURU_TEST_EXPLAIN"] == "TRUE",
    live: live,
    synthetic_only: live && !idmap_overridden,
    now: (Time.now.to_f * 1000).to_i,
  }
end
