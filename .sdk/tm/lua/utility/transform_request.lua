-- Aareguru SDK utility: transform_request

local vs = require("utility.struct.struct")
local helpers = require("core.helpers")

-- `$action` selects the point (see make_point_util); it is never an API
-- field, so the body is a copy without it. The caller's table is left
-- untouched.
local function omit(reqdata, names)
  if not vs.ismap(reqdata) then
    return reqdata
  end
  local skip = {}
  local found = false
  for _, name in ipairs(names) do
    skip[name] = true
    found = found or reqdata[name] ~= nil
  end
  if not found then
    return reqdata
  end
  local body = {}
  for k, v in pairs(reqdata) do
    if not skip[k] then
      body[k] = v
    end
  end
  return body
end

local function strip_action(reqdata)
  return omit(reqdata, { "$action" })
end

local function field_arg(ctx, name)
  for _, kind in ipairs({ "header", "cookie", "query" }) do
    local defs = ctx.point ~= nil and vs.getpath(ctx.point, "args." .. kind) or nil
    if type(defs) == "table" then
      for _, ad in ipairs(defs) do
        if vs.getprop(ad, "name") == name and vs.getprop(ad, "field") == true then
          return true
        end
      end
    end
  end
  return false
end

-- A header, cookie or query argument travels where prepare_headers_util or
-- prepare_query_util sends it, so the body is built from the request data
-- without it, unless the point marks it as a field the body keeps.
local function routed_arg_names(ctx)
  local names = {}
  for _, kind in ipairs({ "header", "cookie", "query" }) do
    for _, arg in ipairs(helpers.call_args(ctx, kind)) do
      if not field_arg(ctx, arg.name) then
        names[#names + 1] = arg.name
      end
    end
  end
  return names
end

local function transform_request_util(ctx)
  local spec = ctx.spec
  local point = ctx.point

  if spec ~= nil then
    spec.step = "reqform"
  end

  local data = omit(ctx.reqdata, routed_arg_names(ctx))

  local transform = helpers.to_map(vs.getprop(point, "transform"))
  if transform == nil then
    return strip_action(data)
  end

  local reqform = vs.getprop(transform, "req")
  if reqform == nil then
    return strip_action(data)
  end

  local reqdata = vs.transform({
    reqdata = data,
  }, reqform)

  return strip_action(reqdata)
end

return transform_request_util
