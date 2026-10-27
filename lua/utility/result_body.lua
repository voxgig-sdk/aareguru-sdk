-- Aareguru SDK utility: result_body

local unreadable_body = require("utility.unreadable_body")

local function result_body_util(ctx)
  local response = ctx.response
  local result = ctx.result

  if result ~= nil then
    if response ~= nil and response.json_func ~= nil and response.body ~= nil then
      local json_data = response.json_func()
      result.body = json_data
    end
    if response ~= nil and response.unreadable then
      local sent = ctx.spec ~= nil and ctx.spec.headers or nil
      result.err = unreadable_body(ctx, result.status, result.headers, response.body,
        sent, result.err)
    end
  end

  return result
end

return result_body_util
