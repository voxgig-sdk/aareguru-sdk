# Aareguru SDK utility: make_error
require_relative '../core/operation'
require_relative '../core/result'
require_relative '../core/error'
require_relative 'clean'
module AareguruUtilities
  MakeError = ->(ctx, err) {
    if ctx.nil?
      require_relative '../core/context'
      ctx = AareguruContext.new({}, nil)
    end
    op = ctx.op || AareguruOperation.new({})
    opname = op.name
    opname = "unknown operation" if opname.empty? || opname == "_"

    result = ctx.result || AareguruResult.new({})
    result.ok = false

    err = result.err if err.nil?
    err = ctx.make_error("unknown", "unknown error") if err.nil?

    # A bare context (no client, no utility) still cleans, through the
    # schema defaults.
    clean = ctx.utility&.clean || AareguruUtilities::Clean

    errmsg = err.is_a?(AareguruError) ? err.msg : err.to_s
    msg = clean.call(ctx, "AareguruSDK: #{opname}: #{errmsg}")

    result.err = nil
    spec = ctx.spec

    if ctx.ctrl.explain
      ctx.ctrl.explain["err"] = { "message" => msg }
    end

    # The context stays reachable for a debugger (`err.ctx`) and is left out
    # of every serialiser the error defines; result and spec are cleaned
    # COPIES, so masking them never masks the pipeline's own objects.
    sdk_err = AareguruError.new(msg, ctx: ctx)
    sdk_err.result = clean.call(ctx, result)
    sdk_err.spec = clean.call(ctx, spec)

    # Promote the HTTP status to the top level, so a consumer can branch on
    # `err.status` / `err.not_found?` instead of reaching into `err.result`.
    sdk_err.status = result.status.nil? ? -1 : result.status
    sdk_err.code = err.code if err.is_a?(AareguruError)

    clean.call(ctx, sdk_err)

    ctx.ctrl.err = sdk_err

    # Fire PreUnexpected so observability features (metrics, telemetry, audit,
    # debug) close/record error paths that never reach PreDone (e.g. a PrePoint
    # rbac short-circuit). Fires after ctx.ctrl.err is set so hooks can read the
    # error; features guard against double-recording when PreDone already fired.
    if ctx.utility && ctx.utility.feature_hook
      ctx.unexpected_fired = true
      ctx.utility.feature_hook.call(ctx, "PreUnexpected")
    end

    # Opt-out escape hatch: when throwing is explicitly disabled, return the
    # bare result data instead of raising.
    if ctx.ctrl.throw_err == false
      return result.resdata
    end
    # Default idiomatic path: raise the already-constructed exception.
    raise sdk_err
  }
end
