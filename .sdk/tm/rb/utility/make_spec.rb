# Aareguru SDK utility: make_spec
require_relative 'struct/voxgig_struct'
require_relative 'graphql'
require_relative 'prepare_method'
require_relative '../core/spec'
module AareguruUtilities
  MakeSpec = ->(ctx) {
    if ctx.out["spec"]
      # A PreSpec hook (validate) rejects the operation by placing its error
      # here; the pipeline raises it, and ctx.spec stays a request spec.
      return nil, ctx.out["spec"] if ctx.out["spec"].is_a?(Exception)
      ctx.spec = ctx.out["spec"]
      return ctx.spec, nil
    end

    point = ctx.point
    options = ctx.options
    utility = ctx.utility

    base = VoxgigStruct.getprop(options, "base") || ""
    prefix = VoxgigStruct.getprop(options, "prefix") || ""
    suffix = VoxgigStruct.getprop(options, "suffix") || ""

    parts = []
    parts = VoxgigStruct.getprop(point, "parts") if point
    parts = [] unless parts.is_a?(Array)

    ctx.spec = AareguruSpec.new({
      "base" => base, "prefix" => prefix, "parts" => parts,
      "suffix" => suffix, "step" => "start",
    })

    ctx.spec.method = utility.prepare_method.call(ctx)

    allow_method = VoxgigStruct.getpath(options, "allow.method")
    unless AareguruUtilities.allowed(allow_method, ctx.spec.method)
      return nil, ctx.make_error("spec_method_allow",
        "Method \"#{ctx.spec.method}\" not allowed by SDK option allow.method value: \"#{allow_method}\"")
    end

    ctx.spec.params = utility.prepare_params.call(ctx)
    ctx.spec.query = utility.prepare_query.call(ctx)
    ctx.spec.headers = utility.prepare_headers.call(ctx)

    if 'graphql' == VoxgigStruct.getprop(point, 'kind')
      # GraphQL addresses one endpoint: no path parts, no query string, and
      # the body carries the operation. prepare_body is skipped
      # deliberately — it only emits a body for data-input ops, whereas
      # every GraphQL op posts one, including load/list/remove.
      ctx.spec.body = utility.graphql_body.call(ctx)
      ctx.spec.path = ''
      # prepare_query already copied the op's match arguments into the
      # query string. Those same values are bound as operation variables,
      # so leaving them would send /graphql?id=i1.
      ctx.spec.query = {}
      ctx.spec.headers['content-type'] = GRAPHQL_CONTENT_TYPE
    else
      ctx.spec.body = utility.prepare_body.call(ctx)
      ctx.spec.path = utility.prepare_path.call(ctx)
    end

    ctx.ctrl.explain["spec"] = ctx.spec if ctx.ctrl.explain

    # Whatever prepare_auth sets in the query, under whichever name, is the
    # credential; a key it leaves as it was is the caller's.
    query = (ctx.spec.query || {}).dup

    spec, err = utility.prepare_auth.call(ctx)
    return nil, err if err

    spec.authquery = (spec.query || {}).keys.select { |k|
      !query.key?(k) || query[k] != spec.query[k]
    }

    ctx.spec = spec
    return spec, nil
  }
end
