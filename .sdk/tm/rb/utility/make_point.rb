# Aareguru SDK utility: make_point
require_relative 'struct/voxgig_struct'
require_relative '../core/helpers'
require_relative '../core/error'
require_relative 'param'
require_relative 'prepare_method'
module AareguruUtilities
  # The path parameters of a point that neither the call nor the entity gives
  # a value for, looked up as prepare_params looks them up.
  def self.unfilled_params(ctx, point)
    parts = VoxgigStruct.getprop(point, "parts")
    return [] unless parts.is_a?(Array)
    parts.each_with_object([]) do |part, missing|
      found = part.to_s.match(/\A\{([^{}\/]+)\}\z/)
      missing << found[1] if found && param_value(ctx, point, found[1]).nil?
    end
  end

  MakePoint = ->(ctx) {
    if ctx.out["point"]
      preset = ctx.out["point"]
      # A feature may short-circuit endpoint resolution by placing an error
      # in ctx.out["point"] (e.g. an rbac denial): surface it as the error
      # tuple slot so the operation fails before any network use.
      return nil, preset if preset.is_a?(AareguruError)
      ctx.point = preset
      return ctx.point, nil
    end

    op = ctx.op
    options = ctx.options

    allow_op = VoxgigStruct.getpath(options, "allow.op")
    unless AareguruUtilities.allowed(allow_op, op.name)
      return nil, ctx.make_error("point_op_allow",
        "Operation \"#{op.name}\" not allowed by SDK option allow.op value: \"#{allow_op}\"")
    end

    if op.points.empty?
      return nil, ctx.make_error("point_no_points",
        "Operation \"#{op.name}\" has no endpoint definitions.")
    end

    if op.points.length == 1
      ctx.point = op.points[0]
    else
      reqselector = op.input == "data" ? ctx.reqdata : ctx.reqmatch
      selector = op.input == "data" ? ctx.data : ctx.match

      point = nil
      matched = false
      op.points.each do |p|
        select_def = AareguruHelpers.to_map(VoxgigStruct.getprop(p, "select"))
        found = true

        if selector && select_def
          exist = VoxgigStruct.getprop(select_def, "exist")
          if exist.is_a?(Array)
            exist.each do |ek|
              rv = VoxgigStruct.getprop(reqselector, ek.to_s)
              sv = VoxgigStruct.getprop(selector, ek.to_s)
              if rv.nil? && sv.nil?
                found = false
                break
              end
            end
          end
        end

        if found
          req_action = VoxgigStruct.getprop(reqselector, "$action")
          select_action = VoxgigStruct.getprop(select_def, "$action")
          found = false if req_action != select_action
        end

        if found
          point = p
          matched = true
          break
        end
      end

      # select.exist can list more than the params needed to pick a point, so
      # nothing matches — fall back to the entity's own route rather than
      # whichever point came last.
      unless matched
        # A request naming an action reaches here only because that action's
        # own point failed its exist test, so it is unbuildable whatever we
        # pick. Refuse it BEFORE choosing a fallback: the guard below
        # compares the chosen point's $action and would wave the request
        # through whenever the fallback lands on the action point itself.
        req_action = reqselector ? VoxgigStruct.getprop(reqselector, "$action") : nil
        if req_action
          return nil, ctx.make_error("point_action_invalid",
            "Operation \"#{op.name}\" action \"#{VoxgigStruct.stringify(req_action)}\" is not valid.")
        end

        # A terminal parameter marks a record route (/boards/{id}); a
        # cross-reference ends in the relationship's name
        # (/posts/{id}/author). Failing that, the shallower path wins.
        parts_len = ->(p) {
          parts = VoxgigStruct.getprop(p, "parts")
          parts.is_a?(Array) ? parts.length : 0
        }
        terminal_param = ->(p) {
          parts = VoxgigStruct.getprop(p, "parts")
          parts.is_a?(Array) && parts.length > 0 && parts[-1].to_s.start_with?("{")
        }
        own_point = ->(points) {
          best = points[0]
          points.each do |p|
            if terminal_param.call(p) != terminal_param.call(best)
              best = p if terminal_param.call(p)
            elsif parts_len.call(p) < parts_len.call(best)
              best = p
            end
          end
          best
        }

        # A call without an action falls back to a point without one, as
        # generation does, and only to a route the call can fill.
        plain = op.points.select { |p|
          VoxgigStruct.getprop(AareguruHelpers.to_map(VoxgigStruct.getprop(p, "select")), "$action").nil?
        }
        if plain.empty?
          return nil, ctx.make_error("point_action_required",
            "Operation \"#{op.name}\" has only action endpoints; pass $action to choose one.")
        end

        fillable = plain.select { |p| AareguruUtilities.unfilled_params(ctx, p).empty? }

        if fillable.empty?
          missing = AareguruUtilities.unfilled_params(ctx, own_point.call(plain)).join(", ")
          return nil, ctx.make_error("point_no_match",
            "Operation \"#{op.name}\" has no endpoint whose path parameters are all given (missing: #{missing}).")
        end

        point = own_point.call(fillable)
      end

      if reqselector
        req_action = VoxgigStruct.getprop(reqselector, "$action")
        if req_action && point
          point_select = AareguruHelpers.to_map(VoxgigStruct.getprop(point, "select"))
          point_action = VoxgigStruct.getprop(point_select, "$action")
          if req_action != point_action
            return nil, ctx.make_error("point_action_invalid",
              "Operation \"#{op.name}\" action \"#{VoxgigStruct.stringify(req_action)}\" is not valid.")
          end
        end
      end

      ctx.point = point
    end

    return ctx.point, nil
  }
end
