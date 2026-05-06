-- V2018 direct test

local json = require("dkjson")
local vs = require("utility.struct.struct")
local sdk = require("aareguru_sdk")
local helpers = require("core.helpers")
local runner = require("test.runner")

describe("V2018Direct", function()
  it("should direct-load-v2018", function()
    local setup = v2018_direct_setup({ id = "direct01" })
    local client = setup.client


    local result, err = client:direct({
      path = "v2018/history",
      method = "GET",
      params = {},
    })
    assert.is_nil(err)
    assert.is_true(result["ok"])
    assert.are.equal(200, helpers.to_int(result["status"]))
    assert.is_not_nil(result["data"])

    if not setup.live then
      if type(result["data"]) == "table" then
        assert.are.equal("direct01", result["data"]["id"])
      end
      assert.are.equal(1, #setup.calls)
    end
  end)

end)


function v2018_direct_setup(mockres)
  runner.load_env_local()

  local calls = {}

  local env = runner.env_override({
    ["AAREGURU_TEST_V_____ENTID"] = {},
    ["AAREGURU_TEST_LIVE"] = "FALSE",
    ["AAREGURU_APIKEY"] = "NONE",
  })

  local live = env["AAREGURU_TEST_LIVE"] == "TRUE"

  if live then
    local merged_opts = {
      apikey = env["AAREGURU_APIKEY"],
    }
    local client = sdk.new(merged_opts)
    return {
      client = client,
      calls = calls,
      live = true,
      idmap = {},
    }
  end

  local function mock_fetch(url, init)
    table.insert(calls, { url = url, init = init })
    return {
      status = 200,
      statusText = "OK",
      headers = {},
      json = function()
        if mockres ~= nil then
          return mockres
        end
        return { id = "direct01" }
      end,
      body = "mock",
    }, nil
  end

  local client = sdk.new({
    base = "http://localhost:8080",
    system = {
      fetch = mock_fetch,
    },
  })

  return {
    client = client,
    calls = calls,
    live = false,
    idmap = {},
  }
end
