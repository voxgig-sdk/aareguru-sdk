-- Aareguru SDK helpers

local vs = require("utility.struct.struct")

local helpers = {}


function helpers.to_map(v)
  if type(v) == "table" then
    return v
  end
  return nil
end


function helpers.to_int(v)
  if type(v) == "number" then
    return math.floor(v)
  end
  return -1
end


function helpers.get_ctx_prop(m, key)
  if m == nil then
    return nil
  end
  return m[key]
end


-- The name a point gives a parameter in the call, if it renames it.
function helpers.param_alias(point, key)
  local alias = point ~= nil and helpers.to_map(vs.getprop(point, "alias")) or nil
  local ak = alias ~= nil and vs.getprop(alias, key) or nil
  return type(ak) == "string" and ak or ""
end


-- The value the call or its entity gives a point's parameter, under its name
-- or the point's alias for it.
function helpers.param_value(ctx, point, key)
  local akey = helpers.param_alias(point, key)

  local val = vs.getprop(ctx.reqmatch, key)

  if val == nil then
    val = vs.getprop(ctx.match, key)
  end

  if val == nil and akey ~= "" then
    val = vs.getprop(ctx.reqmatch, akey)
  end

  if val == nil then
    val = vs.getprop(ctx.reqdata, key)
  end

  if val == nil then
    val = vs.getprop(ctx.data, key)
  end

  if val == nil and akey ~= "" then
    val = vs.getprop(ctx.reqdata, akey)
    if val == nil then
      val = vs.getprop(ctx.data, akey)
    end
  end

  return val
end


-- The arguments a point declares in one location, query or header, each as
-- { name, wire, val }: the name it travels under and the value this call
-- passes in its match or else its data. Unlike a path parameter, the entity's
-- stored match and data never supply one.
function helpers.call_args(ctx, kind)
  local out = {}
  local defs = ctx.point ~= nil and vs.getpath(ctx.point, "args." .. kind) or nil
  if type(defs) ~= "table" then
    return out
  end
  for _, ad in ipairs(defs) do
    local name = vs.getprop(ad, "name")
    if type(name) == "string" and name ~= "" then
      local wire = vs.getprop(ad, "orig")
      if type(wire) ~= "string" or wire == "" then
        wire = name
      end
      local val = vs.getprop(ctx.reqmatch or {}, name)
      if val == nil then
        val = vs.getprop(ctx.reqdata or {}, name)
      end
      out[#out + 1] = { name = name, wire = wire, val = val }
    end
  end
  return out
end


-- The caller's cookie pieces with the named cookies removed: a cookie is one
-- ;-delimited piece, whatever its value holds.
function helpers.cookie_keep(header, names)
  local kept = {}
  for piece in string.gmatch(header .. ";", "([^;]*);") do
    local cookie = piece:match("^%s*(.-)%s*$")
    local name = cookie:match("^([^=]*)"):match("^%s*(.-)%s*$")
    if cookie ~= "" and not names[name] then
      kept[#kept + 1] = cookie
    end
  end
  return kept
end



-- Whether a comma-separated allow option names the item: whole names, any case.
function helpers.allowed(names, item)
  if type(item) ~= "string" or item == "" or type(names) ~= "string" then
    return false
  end
  local want = string.upper(item)
  for name in string.gmatch(names, "[^,]+") do
    if string.upper((name:gsub("^%s+", ""):gsub("%s+$", ""))) == want then
      return true
    end
  end
  return false
end


return helpers
