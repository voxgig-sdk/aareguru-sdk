# Aareguru SDK utility: done
module AareguruUtilities
  Done = ->(ctx) {
    CleanExplain.call(ctx)
    if ctx.result && ctx.result.ok
      return ctx.result.resdata
    end
    # On error, make_error raises the exception (or, when throw_err is
    # disabled, returns the bare result data). Propagate its value.
    ctx.utility.make_error.call(ctx, nil)
  }

  # The caller's own hash is the explain record (the control is built from
  # it, and a stream copies only its ctrl), so the cleaned copy is written
  # back INTO it: assigning a fresh hash would leave the caller holding the
  # raw one.
  CleanExplain = ->(ctx) {
    explain = ctx.ctrl.explain
    return unless explain.is_a?(Hash)
    cleaned = ctx.utility.clean.call(ctx, explain)
    explain.replace(cleaned) if cleaned.is_a?(Hash) && !cleaned.equal?(explain)
    # With clean off, explain.result is the live result object, not a Hash.
    er = explain["result"]
    explain["result"] = er.reject { |k, _| k == "err" } if er.is_a?(Hash)
  }
end
