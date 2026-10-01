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

-- A header argument travels as a header, which prepare_headers_util sends, so
-- the body is built from the request data without it.
local function header_arg_names(point)
  local names = {}
  local hl = point ~= nil and vs.getpath(point, "args.header") or nil
  if type(hl) == "table" then
    for _, hd in ipairs(hl) do
      local name = vs.getprop(hd, "name")
      if type(name) == "string" and name ~= "" then
        names[#names + 1] = name
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

  local data = omit(ctx.reqdata, header_arg_names(point))

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
