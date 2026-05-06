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
  local live = runner.getenv("PROJECTNAME_TEST_LIVE")
  local override = runner.getenv("PROJECTNAME_TEST_OVERRIDE")

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

  local explain = runner.getenv("PROJECTNAME_TEST_EXPLAIN")
  if explain ~= nil and explain ~= "" then
    m["PROJECTNAME_TEST_EXPLAIN"] = explain
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


return runner
