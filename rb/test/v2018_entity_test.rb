# V2018 entity test

require "minitest/autorun"
require "json"
require_relative "../Aareguru_sdk"
require_relative "runner"

class V2018EntityTest < Minitest::Test
  def test_create_instance
    testsdk = AareguruSDK.test(nil, nil)
    ent = testsdk.V2018(nil)
    assert !ent.nil?
  end

  def test_basic_flow
    setup = v2018_basic_setup(nil)
    client = setup[:client]

    # Bootstrap entity data from existing test data.
    v2018_ref01_data_raw = Vs.items(Helpers.to_map(
      Vs.getpath(setup[:data], "existing.v2018")))
    v2018_ref01_data = nil
    if v2018_ref01_data_raw.length > 0
      v2018_ref01_data = Helpers.to_map(v2018_ref01_data_raw[0][1])
    end

    # LOAD
    v2018_ref01_ent = client.V2018(nil)
    v2018_ref01_match_dt0 = {
      "id" => v2018_ref01_data["id"],
    }
    v2018_ref01_data_dt0_loaded, err = v2018_ref01_ent.load(v2018_ref01_match_dt0, nil)
    assert_nil err
    v2018_ref01_data_dt0_load_result = Helpers.to_map(v2018_ref01_data_dt0_loaded)
    assert !v2018_ref01_data_dt0_load_result.nil?
    assert_equal v2018_ref01_data_dt0_load_result["id"], v2018_ref01_data["id"]

  end
end

def v2018_basic_setup(extra)
  Runner.load_env_local

  entity_data_file = File.join(__dir__, "..", "..", ".sdk", "test", "entity", "v2018", "V2018TestData.json")
  entity_data_source = File.read(entity_data_file)
  entity_data = JSON.parse(entity_data_source)

  options = {}
  options["entity"] = entity_data["existing"]

  client = AareguruSDK.test(options, extra)

  # Generate idmap via transform.
  idmap = Vs.transform(
    ["v201801", "v201802", "v201803"],
    {
      "`$PACK`" => ["", {
        "`$KEY`" => "`$COPY`",
        "`$VAL`" => ["`$FORMAT`", "upper", "`$COPY`"],
      }],
    }
  )

  env = Runner.env_override({
    "AAREGURU_TEST_V_____ENTID" => idmap,
    "AAREGURU_TEST_LIVE" => "FALSE",
    "AAREGURU_TEST_EXPLAIN" => "FALSE",
    "AAREGURU_APIKEY" => "NONE",
  })

  idmap_resolved = Helpers.to_map(
    env["AAREGURU_TEST_V_____ENTID"])
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
