# Aareguru SDK utility: prepare_body
require_relative 'media'
module AareguruUtilities
  PrepareBody = ->(ctx) {
    return nil unless ctx.op.input == "data"
    return AareguruUtilities.raw_body(ctx.reqdata) if AareguruUtilities.raw_request?(ctx.point)
    ctx.utility.transform_request.call(ctx)
  }
end
