-- Aareguru SDK utility: prepare_auth

local vs = require("utility.struct.struct")

local HEADER_AUTH = "authorization"
local OPTION_APIKEY = "apikey"
local NOT_FOUND = "__NOTFOUND__"


-- The client's auth.name option, when set, replaces the name the API declares.
local function auth_name(options)
  local name = vs.getpath(options, "auth.name")
  if type(name) == "string" and name ~= "" then
    -- ASCII rules, as a field name is ASCII: lower-casing in the string library follows the C locale.
    return (string.gsub(name, "[A-Z]", function(c) return string.char(c:byte() + 32) end))
  end
  return HEADER_AUTH
end

local function prepare_auth_util(ctx)
  local spec = ctx.spec
  if spec == nil then
    return nil, ctx:make_error("auth_no_spec",
      "Expected context spec property to be defined.")
  end

  local headers = spec.headers
  local options = ctx.client:options_map()

  -- Public APIs that need no auth omit the options.auth block entirely.
  if options.auth == nil then
    headers[HEADER_AUTH] = nil
    return spec, nil
  end

  local name = auth_name(options)

  -- A credential left under the declared name would travel beside the renamed one.
  if name ~= HEADER_AUTH then
    headers[HEADER_AUTH] = nil
  end

  local apikey = vs.getprop(options, OPTION_APIKEY, NOT_FOUND)

  if apikey == nil
    or (type(apikey) == "string" and (apikey == NOT_FOUND or apikey == ""))
  then
    headers[name] = nil
  else
    local auth_prefix = ""
    local ap = vs.getpath(options, "auth.prefix")
    if type(ap) == "string" then
      auth_prefix = ap
    end
    local apikey_val = ""
    if type(apikey) == "string" then
      apikey_val = apikey
    end
    -- Empty prefix (raw apiKey credential) must not add a leading space.
    if auth_prefix == "" then
      headers[name] = apikey_val
    else
      headers[name] = auth_prefix .. " " .. apikey_val
    end
  end

  return spec, nil
end

return prepare_auth_util
