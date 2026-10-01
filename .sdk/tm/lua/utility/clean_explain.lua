-- Aareguru SDK utility: clean_explain

-- In place: the caller may hold the record, and a stream copies only its
-- ctrl. With clean off explain.result is the live result make_error reads,
-- so err is pruned from a copy of it.
local function clean_explain_util(ctx)
  local explain = ctx.ctrl.explain
  if type(explain) ~= "table" then
    return
  end

  local cleaned = ctx.utility.clean(ctx, explain)
  if type(cleaned) == "table" and cleaned ~= explain then
    for k in pairs(explain) do
      explain[k] = nil
    end
    for k, v in pairs(cleaned) do
      explain[k] = v
    end
  end

  local result = explain["result"]
  if type(result) == "table" then
    local pruned = {}
    for k, v in pairs(result) do
      if k ~= "err" then
        pruned[k] = v
      end
    end
    explain["result"] = pruned
  end
end

return clean_explain_util
