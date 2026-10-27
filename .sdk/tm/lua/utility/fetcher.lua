-- Aareguru SDK utility: fetcher

local vs = require("utility.struct.struct")
local json = require("dkjson")
local AareguruError = require("core.error")

local GETONLY_ENV = "VOXGIG_GETONLY_GUARD"

-- A GET-only live run refuses any other method before it is sent. The error
-- names the path alone: the query can carry a credential.
local function getonly_refusal(fullurl, method)
  method = string.upper(tostring(method or ""))
  if method == "" then
    method = "GET"
  end
  if os.getenv(GETONLY_ENV) ~= "TRUE" or method == "GET" then
    return nil
  end
  local rest = fullurl
  local scheme = string.find(rest, "://", 1, true)
  if scheme then
    rest = string.gsub(string.sub(rest, scheme + 3), "^[^/?#]*", "")
  end
  local path = string.match(rest, "^[^?#]*")
  if path == "" then
    path = "/"
  end
  return AareguruError.new("fetch_getonly_block",
    "[GET-ONLY GUARD] blocked " .. method .. " " .. path)
end

local function default_http_fetch(fullurl, fetchdef)
  local refused = getonly_refusal(fullurl, fetchdef["method"])
  if refused then
    return nil, refused
  end

  -- Use LuaSocket or similar for real HTTP requests.
  -- This is the default live implementation.
  local http_ok, http = pcall(require, "socket.http")
  local ltn12_ok, ltn12 = pcall(require, "ltn12")

  if not http_ok or not ltn12_ok then
    return nil, "HTTP library not available (install luasocket)"
  end

  local method = fetchdef["method"] or "GET"
  local body_str = fetchdef["body"]
  local headers = fetchdef["headers"] or {}

  if type(body_str) ~= "string" then
    body_str = nil
  end

  if body_str ~= nil then
    headers["content-length"] = tostring(#body_str)
  end

  -- Default User-Agent — many CDNs reject requests with no UA. Set a
  -- Mozilla-shaped UA unless the caller already set one.
  local has_ua = false
  for k, _ in pairs(headers) do
    if string.lower(k) == "user-agent" then
      has_ua = true
      break
    end
  end
  if not has_ua then
    headers["User-Agent"] = "Mozilla/5.0 (compatible; AareguruSDK/1.0)"
  end

  local response_body = {}
  local res, code, response_headers = http.request({
    url = fullurl,
    method = method,
    headers = headers,
    source = body_str and ltn12.source.string(body_str) or nil,
    sink = ltn12.sink.table(response_body),
  })

  if not res then
    return nil, code
  end

  local body = table.concat(response_body)
  local resp_headers = {}
  if type(response_headers) == "table" then
    for k, v in pairs(response_headers) do
      resp_headers[string.lower(k)] = v
    end
  end

  local json_body = nil
  local unreadable = false
  if string.find(body, "%S") then
    local decoded, pos, err = json.decode(body)
    if err ~= nil or string.find(body, "%S", pos) then
      unreadable = true
    else
      json_body = decoded
    end
  end

  local status_text = "OK"
  if code >= 400 then
    status_text = "Error"
  end

  return {
    status = code,
    statusText = status_text,
    headers = resp_headers,
    json = function() return json_body end,
    body = body,
    unreadable = unreadable,
  }, nil
end


local function fetcher_util(ctx, fullurl, fetchdef)
  if ctx.client.mode ~= "live" then
    return nil, ctx:make_error("fetch_mode_block",
      'Request blocked by mode: "' .. ctx.client.mode ..
      '" (URL was: "' .. fullurl .. '")')
  end

  local options = ctx.client:options_map()
  if vs.getpath(options, "feature.test.active") == true then
    return nil, ctx:make_error("fetch_test_block",
      'Request blocked as test feature is active' ..
      ' (URL was: "' .. fullurl .. '")')
  end

  local sys_fetch = vs.getpath(options, "system.fetch")

  if sys_fetch == nil then
    return default_http_fetch(fullurl, fetchdef)
  end

  if type(sys_fetch) == "function" then
    return sys_fetch(fullurl, fetchdef)
  end

  return nil, ctx:make_error("fetch_invalid", "system.fetch is not a valid function")
end

return fetcher_util
