# Aareguru SDK utility: transform_request
require_relative 'struct/voxgig_struct'
require_relative '../core/helpers'
require_relative 'param'
module AareguruUtilities
  # `$action` selects the point (see MakePoint); it is never an API field, so
  # the body is a copy without it. The caller's hash is left untouched.
  def self.strip_action(reqdata)
    omit_keys(reqdata, ["$action"])
  end

  # A header, cookie or query argument travels where PrepareHeaders or
  # PrepareQuery sends it, so the body is built from the request data without
  # it, unless the point marks it as a field the body keeps.
  def self.routed_arg_names(ctx)
    (call_args(ctx, "header") + call_args(ctx, "cookie") + call_args(ctx, "query")).map(&:first)
      .reject { |name| field_arg?(ctx, name) }
  end

  def self.field_arg?(ctx, name)
    ["header", "cookie", "query"].any? do |kind|
      defs = ctx.point ? VoxgigStruct.getpath(ctx.point, "args.#{kind}") : nil
      defs.is_a?(Array) && defs.any? do |ad|
        VoxgigStruct.getprop(ad, "name") == name && true == VoxgigStruct.getprop(ad, "field")
      end
    end
  end

  def self.omit_keys(reqdata, names)
    return reqdata unless reqdata.is_a?(Hash) && names.any? { |n| reqdata.key?(n) }
    reqdata.reject { |k, _| names.include?(k) }
  end

  TransformRequest = ->(ctx) {
    spec = ctx.spec
    point = ctx.point
    spec.step = "reqform" if spec
    data = AareguruUtilities.omit_keys(ctx.reqdata, AareguruUtilities.routed_arg_names(ctx))
    transform = AareguruHelpers.to_map(VoxgigStruct.getprop(point, "transform"))
    return AareguruUtilities.strip_action(data) unless transform
    reqform = VoxgigStruct.getprop(transform, "req")
    return AareguruUtilities.strip_action(data) unless reqform
    AareguruUtilities.strip_action(VoxgigStruct.transform({ "reqdata" => data }, reqform))
  }
end
