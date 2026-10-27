-- Aareguru SDK utility: unreadable_body

local PREVIEW_LENGTH = 160


local function header_value(headers, name)
  if type(headers) ~= "table" then
    return ""
  end
  for k, v in pairs(headers) do
    if string.lower(tostring(k)) == name then
      return tostring(v)
    end
  end
  return ""
end


-- Cleaned whole: a secret the bound would split could leave its prefix.
local function preview(ctx, text)
  local flat = (string.gsub(tostring(text), "%s+", " "))
  flat = (string.gsub(flat, "^ ", ""))
  flat = (string.gsub(flat, " $", ""))
  flat = tostring(ctx.utility.clean(ctx, flat))
  local count = utf8.len(flat)
  if count == nil then
    if #flat > PREVIEW_LENGTH then
      return string.sub(flat, 1, PREVIEW_LENGTH) .. "..."
    end
    return flat
  end
  if count > PREVIEW_LENGTH then
    return string.sub(flat, 1, utf8.offset(flat, PREVIEW_LENGTH + 1) - 1) .. "..."
  end
  return flat
end


-- A body that is not JSON. An HTTP failure keeps its own error, with the
-- response described; otherwise the code tells a wrong content type from
-- malformed JSON.
local function unreadable_body(ctx, status, headers, text, sent, failed)
  local ctype = header_value(headers, "content-type")
  local agent = ctx.utility.clean(ctx, header_value(sent, "user-agent"))
  if agent == nil or agent == "" then
    agent = "transport default"
  end
  local detail = "HTTP " .. tostring(status) .. ", content-type " ..
    (ctype == "" and "none" or ctype) .. ", user-agent " .. tostring(agent)
  if text ~= nil then
    detail = detail .. ", body: " .. preview(ctx, text)
  end

  if failed ~= nil then
    if type(failed) == "table" and type(failed.msg) == "string" then
      failed.msg = failed.msg .. " (" .. detail .. ")"
      return failed
    end
    return tostring(failed) .. " (" .. detail .. ")"
  end

  if ctype == "" or string.find(string.lower(ctype), "json", 1, true) then
    return ctx:make_error("response_json_invalid",
      "response: body is not valid JSON (" .. detail .. ")")
  end
  return ctx:make_error("response_content_type",
    "response: expected JSON, got " .. ctype .. " (" .. detail .. ")")
end

return unreadable_body
