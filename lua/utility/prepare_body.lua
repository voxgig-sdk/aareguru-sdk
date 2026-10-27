-- Aareguru SDK utility: prepare_body

local media = require("utility.media")

local function prepare_body_util(ctx)
  local op = ctx.op

  if op.input == "data" then
    if media.is_raw_request(ctx.point) then
      return media.raw_body(ctx.reqdata)
    end
    local body = ctx.utility.transform_request(ctx)
    return body
  end

  return nil
end

return prepare_body_util
