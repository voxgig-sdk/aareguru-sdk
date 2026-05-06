# Aareguru SDK utility: make_context
require_relative '../core/context'
module AareguruUtilities
  MakeContext = ->(ctxmap, basectx) {
    AareguruContext.new(ctxmap, basectx)
  }
end
