-- Aareguru SDK utility: media

-- The media types a point declares: `response` (the model's `rs`) for the
-- Accept header, and `body` (the model's `rb`) for the request body.

local vs = require("utility.struct.struct")

local M = {}

-- The data key holding a raw request body. Like `$action`, it can never be a
-- declared argument name.
M.RAW_BODY = "$body"

function M.is_json_media(media)
  local m = string.lower((tostring(media or ""):match("^[^;]*")):match("^%s*(.-)%s*$"))
  return m == "application/json" or m == "text/json" or m:sub(-5) == "+json"
end

-- The declared JSON type alone, else every declared type in the model's
-- order; nil when no success response declares a body.
function M.accept_of(point)
  local res = vs.getprop(point, "response")
  local media = vs.getprop(res, "media")
  if type(media) ~= "string" or media == "" then
    return nil
  end
  if vs.getprop(res, "kind") == "json" then
    return media
  end
  local types = { media }
  local alts = vs.getprop(res, "alternatives")
  if type(alts) == "table" then
    for _, alt in ipairs(alts) do
      local m = vs.getprop(alt, "media")
      if type(m) == "string" and m ~= "" then
        types[#types + 1] = m
      end
    end
  end
  return table.concat(types, ", ")
end

function M.is_raw_request(point)
  return vs.getpath(point, "body.kind") == "raw"
end

function M.is_json_request(point)
  return vs.getpath(point, "body.kind") == "json"
end

-- A table is JSON, and so is a scalar on a point that declares a JSON body.
-- Anything else goes as given.
function M.request_body(point, body)
  if type(body) == "table" or (type(body) ~= "userdata" and M.is_json_request(point)) then
    return vs.jsonify(body)
  end
  return body
end

local function has_header(headers, name)
  for key in pairs(headers) do
    if type(key) == "string" and string.lower(key) == name then
      return true
    end
  end
  return false
end

-- A caller's accept wins. A declared request type replaces each JSON
-- content-type, the SDK default, and leaves any other the caller set.
function M.media_headers(point, headers)
  local accept = M.accept_of(point)
  if accept ~= nil and not has_header(headers, "accept") then
    headers["accept"] = accept
  end

  local body = vs.getprop(point, "body")
  local kind = vs.getprop(body, "kind")
  local media = vs.getprop(body, "media")
  if (kind == "raw" or kind == "json") and type(media) == "string" and media ~= "" then
    local drop = {}
    for key, val in pairs(headers) do
      if type(key) == "string" and string.lower(key) == "content-type" and M.is_json_media(val) then
        drop[#drop + 1] = key
      end
    end
    for _, key in ipairs(drop) do
      headers[key] = nil
    end
    if not has_header(headers, "content-type") then
      headers["content-type"] = media
    end
  end

  return headers
end

-- A string, of bytes or text, sent as it is.
function M.raw_body(reqdata)
  if type(reqdata) ~= "table" then
    return nil
  end
  return reqdata[M.RAW_BODY]
end

return M
