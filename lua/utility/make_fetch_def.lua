-- Aareguru SDK utility: make_fetch_def

local media = require("utility.media")

local function make_fetch_def_util(ctx)
  local spec = ctx.spec
  if spec == nil then
    return nil, ctx:make_error("fetchdef_no_spec",
      "Expected context spec property to be defined.")
  end

  local Result = require("core.result")
  if ctx.result == nil then
    ctx.result = Result.new({})
  end

  spec.step = "prepare"

  local url, err = ctx.utility.make_url(ctx)
  if err ~= nil then
    return nil, err
  end

  spec.url = url

  local fetchdef = {
    url = url,
    method = spec.method,
    headers = spec.headers,
  }

  if spec.body ~= nil then
    fetchdef["body"] = media.request_body(ctx.point, spec.body)
  end

  return fetchdef, nil
end

return make_fetch_def_util
