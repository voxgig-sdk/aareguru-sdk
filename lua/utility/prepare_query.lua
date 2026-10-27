-- Aareguru SDK utility: prepare_query

local vs = require("utility.struct.struct")
local helpers = require("core.helpers")

local function contains_param(params, s)
  for _, v in ipairs(params) do
    if type(v) == "string" and v == s then
      return true
    end
  end
  return false
end

local function prepare_query_util(ctx)
  local point = ctx.point
  local reqmatch = ctx.reqmatch or {}

  local params = {}
  if point ~= nil then
    local p = vs.getprop(point, "params")
    if type(p) == "table" then
      for _, v in ipairs(p) do
        table.insert(params, v)
      end
    end
    -- A path parameter travels in the path. The generated config lists them
    -- as args.params, which prepare_params reads; params is the older list.
    local pl = vs.getpath(point, "args.params")
    if type(pl) == "table" then
      for _, pd in ipairs(pl) do
        local name = vs.getprop(pd, "name")
        if type(name) == "string" then
          table.insert(params, name)
        end
      end
    end
    -- A header or cookie parameter travels in the headers, which prepare_headers
    -- fills, unless a query parameter shares its name: then both are sent.
    local declared = {}
    local ql = vs.getpath(point, "args.query")
    if type(ql) == "table" then
      for _, qd in ipairs(ql) do
        local qname = vs.getprop(qd, "name")
        if type(qname) == "string" then
          declared[qname] = true
        end
      end
    end
    local hl = vs.getpath(point, "args.header")
    local cl = vs.getpath(point, "args.cookie")
    for _, located in ipairs({ hl or {}, cl or {} }) do
      if type(located) == "table" then
        for _, hd in ipairs(located) do
          local name = vs.getprop(hd, "name")
          if type(name) == "string" and not declared[name] then
            table.insert(params, name)
          end
        end
      end
    end
  end

  -- A query parameter travels under the name the definition gives it, its
  -- orig, which the model may have renamed for the caller.
  local wire = {}
  if point ~= nil then
    local ql = vs.getpath(point, "args.query")
    if type(ql) == "table" then
      for _, qd in ipairs(ql) do
        local name = vs.getprop(qd, "name")
        local orig = vs.getprop(qd, "orig")
        if type(name) == "string" and type(orig) == "string" and orig ~= "" then
          wire[name] = orig
        end
      end
    end
  end

  local out = {}
  local reqmatch_items = vs.items(reqmatch)
  if reqmatch_items ~= nil then
    for _, item in ipairs(reqmatch_items) do
      local key = item[1]
      local val = item[2]
      if val ~= nil and type(key) == "string" and key ~= "$action"
          and not contains_param(params, key) then
        out[wire[key] or key] = val
      end
    end
  end

  -- A create or update passes its query arguments in its data.
  for _, arg in ipairs(helpers.call_args(ctx, "query")) do
    if arg.val ~= nil and not contains_param(params, arg.name) then
      out[arg.wire] = arg.val
    end
  end

  return out
end

return prepare_query_util
