-- Aareguru SDK test runner

local json = require("dkjson")
local vs = require("utility.struct.struct")

local runner = {}


function runner.load_env_local()
  local f = io.open("../../.env.local", "r")
  if f == nil then
    return
  end
  local content = f:read("*a")
  f:close()
  for raw_line in content:gmatch("[^\r\n]+") do
    local line = raw_line:match("^%s*(.-)%s*$")
    if line ~= "" and not line:match("^#") then
      local key, val = line:match("^([^=]+)=(.*)$")
      if key and val then
        key = key:match("^%s*(.-)%s*$")
        val = val:match("^%s*(.-)%s*$")
        -- Set as env variable (platform-dependent, stored in table)
        runner._env[key] = val
      end
    end
  end
end

runner._env = {}

function runner.getenv(key)
  return runner._env[key] or os.getenv(key)
end


function runner.env_override(m)
  local live = runner.getenv("PROJECTENV_TEST_LIVE")
  local override = runner.getenv("PROJECTENV_TEST_OVERRIDE")

  if live == "TRUE" or override == "TRUE" then
    for key, _ in pairs(m) do
      local envval = runner.getenv(key)
      if envval ~= nil and envval ~= "" then
        envval = envval:match("^%s*(.-)%s*$")
        if envval:sub(1, 1) == "{" then
          local parsed = json.decode(envval)
          if parsed ~= nil then
            m[key] = parsed
            goto continue
          end
        end
        m[key] = envval
        ::continue::
      end
    end
  end

  local explain = runner.getenv("PROJECTENV_TEST_EXPLAIN")
  if explain ~= nil and explain ~= "" then
    m["PROJECTENV_TEST_EXPLAIN"] = explain
  end

  return m
end


function runner.entity_list_to_data(list)
  local out = {}
  for _, item in ipairs(list) do
    if type(item) == "table" then
      if type(item.data_get) == "function" then
        local d = item:data_get()
        if type(d) == "table" then
          table.insert(out, d)
        end
      else
        table.insert(out, item)
      end
    end
  end
  return out
end


-- Load sdk-test-control.json from this test dir; cache. Returns an
-- empty-skip default if the file is missing or invalid.
runner._test_control = nil

function runner.load_test_control()
  if runner._test_control ~= nil then
    return runner._test_control
  end
  local this_dir = debug.getinfo(1, "S").source:match("^@(.+/)") or "./"
  local ctrl_path = this_dir .. "sdk-test-control.json"
  local f = io.open(ctrl_path, "r")
  if f == nil then
    runner._test_control = {
      version = 1,
      test = {
        skip = {
          live = { direct = {}, entityOp = {} },
          unit = { direct = {}, entityOp = {} },
        },
      },
    }
    return runner._test_control
  end
  local content = f:read("*a")
  f:close()
  local parsed = json.decode(content)
  if parsed == nil then
    runner._test_control = {
      version = 1,
      test = {
        skip = {
          live = { direct = {}, entityOp = {} },
          unit = { direct = {}, entityOp = {} },
        },
      },
    }
  else
    runner._test_control = parsed
  end
  return runner._test_control
end


-- Check sdk-test-control.json for a skip entry. Returns (skip, reason).
function runner.is_control_skipped(kind, name, mode)
  local ctrl = runner.load_test_control()
  local skip = (((ctrl.test or {}).skip or {})[mode] or {})
  local items = skip[kind] or {}
  for _, item in ipairs(items) do
    if kind == "direct" and item.test == name then
      return true, item.reason
    end
    if kind == "entityOp" then
      local key = (item.entity or "") .. "." .. (item.op or "")
      if key == name then
        return true, item.reason
      end
    end
  end
  return false, nil
end


-- Extra SDK options every LIVE client is constructed with, read from
-- sdk-test-control.json `test.client.options`.
--
-- The generated live client knows two things: the base URL (from the spec)
-- and the credential (from the environment). Everything else about how a
-- particular API wants to be talked to - which features to switch on, and
-- with what settings - is a property of THAT API, known to the project and
-- to nothing in the toolchain.
--
-- Merged UNDER the generated fields, so the suite's own base/apikey/server
-- values win: this ADDS to the live client, it does not redirect it.
--
-- Reserved fields are stripped HERE rather than at each merge site: the
-- generated table only names a field when the model calls for one, so a
-- "base" in this block would face no competing value and would silently
-- redirect the whole suite - credential included - to another host.
local LIVE_RESERVED = {
  base = true, prefix = true, suffix = true,
  server = true, apikey = true, secret = true,
}

function runner.live_client_options()
  local ctrl = runner.load_test_control()
  local test = ctrl.test
  if type(test) ~= "table" then return {} end
  local client = test.client
  if type(client) ~= "table" then return {} end
  local opts = client.options
  if type(opts) ~= "table" then return {} end

  local out = {}
  for k, v in pairs(opts) do
    if not LIVE_RESERVED[k] then
      out[k] = v
    end
  end
  return out
end


-- Per-test live pacing delay (ms); default 500.
function runner.live_delay_ms()
  local ctrl = runner.load_test_control()
  local v = ((ctrl.test or {}).live or {}).delayMs
  if type(v) == "number" and v >= 0 then
    return v
  end
  return 500
end



-- A live check that did not pass, as main.kit.test.live.strict decides:
-- strict fails the test, lenient skips it with the same reason. A test
-- passes in busted's pending, which skips only from inside the test.
function runner.live_miss(pending, strict, reason)
  if strict then
    error(reason, 0)
  end
  pending(reason)
end


-- An account holding no record for the test to read skips either way.
function runner.live_empty(pending, reason)
  pending(reason)
end


local function is_list(t)
  if type(t) ~= "table" then
    return false
  end
  local mt = getmetatable(t)
  return t[1] ~= nil or (mt ~= nil and mt.__jsontype == "array") or next(t) == nil
end


-- A live list response's records: the body, or the first list an
-- envelope holds.
function runner.live_list(data)
  if is_list(data) then
    return data
  end
  if type(data) ~= "table" then
    return nil
  end
  local keys = {}
  for k, _ in pairs(data) do
    keys[#keys + 1] = tostring(k)
  end
  table.sort(keys)
  for _, k in ipairs(keys) do
    if type(data[k]) == "table" and is_list(data[k]) then
      return data[k]
    end
  end
  return nil
end


-- A live response for a message: the SDK's error, or else its status and
-- content type, never its body.
function runner.live_describe(result, err)
  if err ~= nil then
    return tostring(err)
  end
  if type(result) ~= "table" then
    return "no response"
  end
  if result["err"] ~= nil then
    return tostring(result["err"])
  end
  local ctype = nil
  for k, v in pairs(result["headers"] or {}) do
    if string.lower(tostring(k)) == "content-type" then
      ctype = (tostring(v):match("^[^;]*"):gsub("%s+$", ""))
    end
  end
  return "HTTP " .. tostring(result["status"]) .. (ctype and (" " .. ctype) or "")
end


-- The record a create-less flow reads live: the first its list returns,
-- put where the flow reads the fixture's existing records.
function runner.live_existing(pending, setup, strict, name, list)
  local ok, found, err = pcall(list)
  if not ok then
    runner.live_miss(pending, strict, "Live list discovery failed: " .. tostring(found))
  end
  if err ~= nil then
    runner.live_miss(pending, strict, "Live list discovery failed: " .. tostring(err))
  end
  if type(found) ~= "table" then
    runner.live_miss(pending, strict, "Live list discovery returned no list")
  end
  if found[1] == nil then
    runner.live_empty(pending, "The account has no " .. name .. " record to load")
  end
  local record = found[1]
  if type(record) == "table" and type(record.data_get) == "function" then
    record = record:data_get()
  end
  setup.data.existing = setup.data.existing or {}
  setup.data.existing[name] = { live01 = record }
end


-- In a lenient live run a failing check skips, observing the live API.
function runner.live_observe(pending, err, setup, strict)
  local mt = getmetatable(err)
  if strict or type(setup) ~= "table" or not setup.live or (mt ~= nil and mt.__type == "pending") then
    error(err, 0)
  end
  pending("live run, main.kit.test.live.strict is false: " .. tostring(err))
end


return runner
