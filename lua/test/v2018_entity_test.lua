-- V2018 entity test

local json = require("dkjson")
local vs = require("utility.struct.struct")
local sdk = require("aareguru_sdk")
local helpers = require("core.helpers")
local runner = require("test.runner")

local _test_dir = debug.getinfo(1, "S").source:match("^@(.+/)")  or "./"

describe("V2018Entity", function()
  it("should create instance", function()
    local testsdk = sdk.test(nil, nil)
    local ent = testsdk:V2018(nil)
    assert.is_not_nil(ent)
  end)

  it("should run basic flow", function()
    local setup = v2018_basic_setup(nil)
    local client = setup.client

    -- Bootstrap entity data from existing test data.
    local v2018_ref01_data_raw = vs.items(helpers.to_map(
      vs.getpath(setup.data, "existing.v2018")))
    local v2018_ref01_data = nil
    if #v2018_ref01_data_raw > 0 then
      v2018_ref01_data = helpers.to_map(v2018_ref01_data_raw[1][2])
    end

    -- LOAD
    local v2018_ref01_ent = client:V2018(nil)
    local v2018_ref01_match_dt0 = {
      id = v2018_ref01_data["id"],
    }
    local v2018_ref01_data_dt0_loaded, err = v2018_ref01_ent:load(v2018_ref01_match_dt0, nil)
    assert.is_nil(err)
    local v2018_ref01_data_dt0_load_result = helpers.to_map(v2018_ref01_data_dt0_loaded)
    assert.is_not_nil(v2018_ref01_data_dt0_load_result)
    assert.are.equal(v2018_ref01_data_dt0_load_result["id"], v2018_ref01_data["id"])

  end)
end)

function v2018_basic_setup(extra)
  runner.load_env_local()

  local entity_data_file = _test_dir .. "../../.sdk/test/entity/v2018/V2018TestData.json"
  local f = io.open(entity_data_file, "r")
  if f == nil then
    error("failed to read v2018 test data: " .. entity_data_file)
  end
  local entity_data_source = f:read("*a")
  f:close()

  local entity_data = json.decode(entity_data_source)

  local options = {}
  options["entity"] = entity_data["existing"]

  local client = sdk.test(options, extra)

  -- Generate idmap via transform.
  local idmap = vs.transform(
    { "v201801", "v201802", "v201803" },
    {
      ["`$PACK`"] = { "", {
        ["`$KEY`"] = "`$COPY`",
        ["`$VAL`"] = { "`$FORMAT`", "upper", "`$COPY`" },
      }},
    }
  )

  local env = runner.env_override({
    ["AAREGURU_TEST_V_____ENTID"] = idmap,
    ["AAREGURU_TEST_LIVE"] = "FALSE",
    ["AAREGURU_TEST_EXPLAIN"] = "FALSE",
    ["AAREGURU_APIKEY"] = "NONE",
  })

  local idmap_resolved = helpers.to_map(
    env["AAREGURU_TEST_V_____ENTID"])
  if idmap_resolved == nil then
    idmap_resolved = helpers.to_map(idmap)
  end

  if env["AAREGURU_TEST_LIVE"] == "TRUE" then
    local merged_opts = vs.merge({
      {
        apikey = env["AAREGURU_APIKEY"],
      },
      extra or {},
    })
    client = sdk.new(helpers.to_map(merged_opts))
  end

  return {
    client = client,
    data = entity_data,
    idmap = idmap_resolved,
    env = env,
    explain = env["AAREGURU_TEST_EXPLAIN"] == "TRUE",
    now = os.time() * 1000,
  }
end
