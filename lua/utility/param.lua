-- Aareguru SDK utility: param

local vs = require("utility.struct.struct")
local helpers = require("core.helpers")

local function param_util(ctx, paramdef)
  local pt = vs.typify(paramdef)
  local key = ""

  if (vs.T_string & pt) > 0 then
    key = paramdef
  else
    local k = vs.getprop(paramdef, "name")
    if type(k) == "string" then
      key = k
    end
  end

  local akey = helpers.param_alias(ctx.point, key)
  if ctx.spec ~= nil and akey ~= "" and
    vs.getprop(ctx.reqmatch, key) == nil and vs.getprop(ctx.match, key) == nil then
    ctx.spec.alias[akey] = key
  end

  return helpers.param_value(ctx, ctx.point, key)
end

return param_util
