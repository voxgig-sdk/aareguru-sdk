-- Aareguru SDK utility: prepare_headers

local vs = require("utility.struct.struct")
local helpers = require("core.helpers")
local media = require("utility.media")

-- The form style of a cookie parameter: a list repeats the name, a map sends
-- its own keys, and every value is percent-encoded.
local function cookie_pair(wire, val)
  local function esc(v)
    return vs.escurl(vs.stringify(v))
  end
  local pairs_ = {}
  if vs.islist(val) then
    for _, item in ipairs(val) do
      pairs_[#pairs_ + 1] = wire .. "=" .. esc(item)
    end
  elseif vs.ismap(val) then
    for _, key in ipairs(vs.keysof(val)) do
      pairs_[#pairs_ + 1] = vs.escurl(key) .. "=" .. esc(val[key])
    end
  else
    pairs_[#pairs_ + 1] = wire .. "=" .. esc(val)
  end
  return table.concat(pairs_, "; ")
end

local function prepare_headers_util(ctx)
  local options = ctx.client:options_map()
  local headers = vs.getprop(options, "headers")

  local out = {}
  if headers ~= nil then
    local cloned = vs.clone(headers)
    if type(cloned) == "table" then
      out = cloned
    end
  end
  out = media.media_headers(ctx.point, out)

  -- A header argument replaces a default of the same name, whatever its case.
  for _, arg in ipairs(helpers.call_args(ctx, "header")) do
    if arg.val ~= nil then
      local wire = string.lower(arg.wire)
      for key in pairs(out) do
        if type(key) == "string" and string.lower(key) == wire then
          out[key] = nil
        end
      end
      out[wire] = vs.stringify(arg.val)
    end
  end

  -- A cookie argument travels in the cookie header, form serialized and
  -- percent-encoded, replacing a cookie of the same name among those the
  -- caller's headers already send.
  local sent = {}
  for _, arg in ipairs(helpers.call_args(ctx, "cookie")) do
    if arg.val ~= nil then
      sent[#sent + 1] = arg
    end
  end
  if #sent > 0 then
    local names = {}
    for _, arg in ipairs(sent) do
      if vs.ismap(arg.val) then
        for _, key in ipairs(vs.keysof(arg.val)) do
          names[vs.escurl(key)] = true
        end
      else
        names[arg.wire] = true
      end
    end
    local kept = {}
    for key, given in pairs(out) do
      if type(key) == "string" and string.lower(key) == "cookie" then
        if type(given) == "string" then
          for _, cookie in ipairs(helpers.cookie_keep(given, names)) do
            kept[#kept + 1] = cookie
          end
        end
        out[key] = nil
      end
    end
    for _, arg in ipairs(sent) do
      local pair = cookie_pair(arg.wire, arg.val)
      if pair ~= "" then
        kept[#kept + 1] = pair
      end
    end
    if #kept > 0 then
      out["cookie"] = table.concat(kept, "; ")
    end
  end

  return out
end

return prepare_headers_util
