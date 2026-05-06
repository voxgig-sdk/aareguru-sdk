-- Stuff entity test

local json = require("dkjson")
local vs = require("utility.struct.struct")
local sdk = require("aareguru_sdk")
local helpers = require("core.helpers")
local runner = require("test.runner")

local _test_dir = debug.getinfo(1, "S").source:match("^@(.+/)")  or "./"

describe("StuffEntity", function()
  it("should create instance", function()
    local testsdk = sdk.test(nil, nil)
    local ent = testsdk:Stuff(nil)
    assert.is_not_nil(ent)
  end)

  it("should run basic flow", function()
    local setup = stuff_basic_setup(nil)
    local client = setup.client

    -- Bootstrap entity data from existing test data.
    local stuff_ref01_data_raw = vs.items(helpers.to_map(
      vs.getpath(setup.data, "existing.stuff")))
    local stuff_ref01_data = nil
    if #stuff_ref01_data_raw > 0 then
      stuff_ref01_data = helpers.to_map(stuff_ref01_data_raw[1][2])
    end

    -- LOAD
    local stuff_ref01_ent = client:Stuff(nil)
    local stuff_ref01_match_dt0 = {
      id = stuff_ref01_data["id"],
    }
    local stuff_ref01_data_dt0_loaded, err = stuff_ref01_ent:load(stuff_ref01_match_dt0, nil)
    assert.is_nil(err)
    local stuff_ref01_data_dt0_load_result = helpers.to_map(stuff_ref01_data_dt0_loaded)
    assert.is_not_nil(stuff_ref01_data_dt0_load_result)
    assert.are.equal(stuff_ref01_data_dt0_load_result["id"], stuff_ref01_data["id"])

  end)
end)

function stuff_basic_setup(extra)
  runner.load_env_local()

  local entity_data_file = _test_dir .. "../../.sdk/test/entity/stuff/StuffTestData.json"
  local f = io.open(entity_data_file, "r")
  if f == nil then
    error("failed to read stuff test data: " .. entity_data_file)
  end
  local entity_data_source = f:read("*a")
  f:close()

  local entity_data = json.decode(entity_data_source)

  local options = {}
  options["entity"] = entity_data["existing"]

  local client = sdk.test(options, extra)

  -- Generate idmap via transform.
  local idmap = vs.transform(
    { "stuff01", "stuff02", "stuff03" },
    {
      ["`$PACK`"] = { "", {
        ["`$KEY`"] = "`$COPY`",
        ["`$VAL`"] = { "`$FORMAT`", "upper", "`$COPY`" },
      }},
    }
  )

  local env = runner.env_override({
    ["AAREGURU_TEST_STUFF_ENTID"] = idmap,
    ["AAREGURU_TEST_LIVE"] = "FALSE",
    ["AAREGURU_TEST_EXPLAIN"] = "FALSE",
    ["AAREGURU_APIKEY"] = "NONE",
  })

  local idmap_resolved = helpers.to_map(
    env["AAREGURU_TEST_STUFF_ENTID"])
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
