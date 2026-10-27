# Aareguru SDK utility: prepare_query
require_relative 'struct/voxgig_struct'
require_relative 'param'
module AareguruUtilities
  PrepareQuery = ->(ctx) {
    point = ctx.point
    reqmatch = ctx.reqmatch || {}
    params = []
    if point
      p = VoxgigStruct.getprop(point, "params")
      params = p.dup if p.is_a?(Array)
      # A path parameter travels in the path. The generated config lists them
      # as args.params, which prepare_params reads; params is the older list.
      pl = VoxgigStruct.getpath(point, "args.params")
      if pl.is_a?(Array)
        pl.each do |pd|
          name = VoxgigStruct.getprop(pd, "name")
          params << name if name.is_a?(String)
        end
      end
      # A header or cookie parameter travels in the headers, which prepare_headers
      # fills, unless a query parameter shares its name: then both are sent.
      ql = VoxgigStruct.getpath(point, "args.query")
      declared = ql.is_a?(Array) ? ql.map { |qd| VoxgigStruct.getprop(qd, "name") } : []
      [VoxgigStruct.getpath(point, "args.header"), VoxgigStruct.getpath(point, "args.cookie")].each do |hl|
        next unless hl.is_a?(Array)
        hl.each do |hd|
          name = VoxgigStruct.getprop(hd, "name")
          params << name if name.is_a?(String) && !declared.include?(name)
        end
      end
    end
    # A query parameter travels under the name the definition gives it, its
    # orig, which the model may have renamed for the caller.
    wire = {}
    if point
      ql = VoxgigStruct.getpath(point, "args.query")
      if ql.is_a?(Array)
        ql.each do |qd|
          name = VoxgigStruct.getprop(qd, "name")
          orig = VoxgigStruct.getprop(qd, "orig")
          wire[name] = orig if name.is_a?(String) && orig.is_a?(String) && !orig.empty?
        end
      end
    end
    out = {}
    items = VoxgigStruct.items(reqmatch)
    if items
      items.each do |item|
        key, val = item[0], item[1]
        out[wire.fetch(key, key)] = val if val && key.is_a?(String) && key != "$action" && !params.include?(key)
      end
    end
    # A create or update passes its query arguments in its data.
    AareguruUtilities.call_args(ctx, "query").each do |name, orig, val|
      out[orig] = val if !val.nil? && !params.include?(name)
    end
    out
  }
end
