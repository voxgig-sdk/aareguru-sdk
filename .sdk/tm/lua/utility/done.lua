-- Aareguru SDK utility: done

local function done_util(ctx)
  ctx.utility.clean_explain(ctx)

  if ctx.result ~= nil and ctx.result.ok then
    return ctx.result.resdata, nil
  end

  return ctx.utility.make_error(ctx, nil)
end

return done_util
