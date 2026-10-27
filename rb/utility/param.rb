# Aareguru SDK utility: param
require_relative 'struct/voxgig_struct'
require_relative '../core/helpers'
module AareguruUtilities
  Param = ->(ctx, paramdef) {
    pt = VoxgigStruct.typify(paramdef)
    key = if (VoxgigStruct::T_string & pt) > 0
            paramdef
          else
            k = VoxgigStruct.getprop(paramdef, "name")
            k.is_a?(String) ? k : ""
          end

    akey = AareguruUtilities.param_alias(ctx.point, key)
    if ctx.spec && !akey.empty? &&
       VoxgigStruct.getprop(ctx.reqmatch, key).nil? && VoxgigStruct.getprop(ctx.match, key).nil?
      ctx.spec.alias_map[akey] = key
    end

    AareguruUtilities.param_value(ctx, ctx.point, key)
  }

  # The name a point gives a parameter in the call, if it renames it.
  def self.param_alias(point, key)
    return "" unless point
    alias_map = AareguruHelpers.to_map(VoxgigStruct.getprop(point, "alias"))
    ak = alias_map ? VoxgigStruct.getprop(alias_map, key) : nil
    ak.is_a?(String) ? ak : ""
  end

  # The value the call or its entity gives a point's parameter, under its name
  # or the point's alias for it.
  def self.param_value(ctx, point, key)
    akey = param_alias(point, key)

    val = VoxgigStruct.getprop(ctx.reqmatch, key)
    val = VoxgigStruct.getprop(ctx.match, key) if val.nil?
    val = VoxgigStruct.getprop(ctx.reqmatch, akey) if val.nil? && !akey.empty?
    val = VoxgigStruct.getprop(ctx.reqdata, key) if val.nil?
    val = VoxgigStruct.getprop(ctx.data, key) if val.nil?

    if val.nil? && !akey.empty?
      val = VoxgigStruct.getprop(ctx.reqdata, akey)
      val = VoxgigStruct.getprop(ctx.data, akey) if val.nil?
    end

    val
  end

  # The arguments a point declares in one location, query or header, each
  # with the name it travels under and the value this call passes in its
  # match or else its data. Unlike a path parameter, the entity's stored match
  # and data never supply one.
  def self.call_args(ctx, kind)
    defs = ctx.point ? VoxgigStruct.getpath(ctx.point, "args.#{kind}") : nil
    return [] unless defs.is_a?(Array)
    defs.each_with_object([]) do |ad, out|
      name = VoxgigStruct.getprop(ad, "name")
      next unless name.is_a?(String) && !name.empty?
      wire = VoxgigStruct.getprop(ad, "orig")
      wire = name unless wire.is_a?(String) && !wire.empty?
      val = VoxgigStruct.getprop(ctx.reqmatch || {}, name)
      val = VoxgigStruct.getprop(ctx.reqdata || {}, name) if val.nil?
      out << [name, wire, val]
    end
  end
end
