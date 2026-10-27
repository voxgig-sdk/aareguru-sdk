-- Aareguru SDK utility: make_url

local vs = require("utility.struct.struct")

local function make_url_util(ctx)
  local spec = ctx.spec
  local result = ctx.result

  if spec == nil then
    return "", ctx:make_error("url_no_spec",
      "Expected context spec property to be defined.")
  end
  if result == nil then
    return "", ctx:make_error("url_no_result",
      "Expected context result property to be defined.")
  end

  local url = vs.join({ spec.base, spec.prefix, spec.path, spec.suffix }, "/", true)
  local resmatch = {}

  -- Sent with the request, never recorded as the entity's match.
  local authquery = {}
  for _, name in ipairs(spec.authquery or {}) do
    authquery[name] = true
  end

  -- A route the definition ends with a slash keeps it, for a Django REST server,
  -- and a host with no path takes /, or luasocket reads a query as the host.
  local orig = ctx.point ~= nil and vs.getprop(ctx.point, "orig") or nil
  if type(orig) == "string" and orig:sub(-1) == "/" and (spec.suffix == nil or spec.suffix == "")
      and url:sub(-1) ~= "/" then
    url = url .. "/"
  end
  local authority = url:find("://", 1, true)
  if authority ~= nil and 1 < authority and not url:find("[/?#]", authority + 3) then
    url = url .. "/"
  end

  local param_items = vs.items(spec.params)
  if param_items ~= nil then
    for _, item in ipairs(param_items) do
      local key = item[1]
      local val = item[2]
      if val ~= nil and type(key) == "string" then
        local placeholder = "{" .. key .. "}"
        local val_str = type(val) == "string" and val or tostring(val)
        -- A whole . or .. is a dot segment, which moves the request to another route.
        if val_str == "." or val_str == ".." then
          return "", ctx:make_error("url_param_invalid",
            "URL path parameter " .. key .. " cannot be \"" .. val_str .. "\".")
        end
        local encoded = vs.escurl(val_str)
        -- Plain string replacement (not pattern-based)
        local i, j = url:find(placeholder, 1, true)
        while i do
          url = url:sub(1, i - 1) .. encoded .. url:sub(j + 1)
          i, j = url:find(placeholder, i + #encoded, true)
        end
        resmatch[key] = val
      end
    end
  end

  -- A placeholder left in the route would send the request to the wrong route.
  -- The base's own placeholders are server variables, resolved with the options.
  local base = type(spec.base) == "string" and (spec.base:gsub("/+$", "")) or ""
  local route = url:sub(1, #base) == base and url:sub(#base + 1) or url
  local unfilled = {}
  for found in route:gmatch("{[^{}/]+}") do
    unfilled[#unfilled + 1] = found
  end
  if #unfilled > 0 then
    return "", ctx:make_error("url_param_missing",
      "URL path has no value for " .. table.concat(unfilled, ", ") .. ".")
  end

  -- Append query string from spec.query.
  local qsep = "?"
  local query_items = vs.items(spec.query)
  if query_items ~= nil then
    for _, item in ipairs(query_items) do
      local key = item[1]
      local val = item[2]
      if val ~= nil and type(key) == "string" then
        local val_str = type(val) == "string" and val or tostring(val)
        url = url .. qsep .. vs.escurl(key) .. "=" .. vs.escurl(val_str)
        qsep = "&"
        if not authquery[key] then
          resmatch[key] = val
        end
      end
    end
  end

  result.resmatch = resmatch

  return url, nil
end

return make_url_util
