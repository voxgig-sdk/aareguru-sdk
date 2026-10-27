require_relative '../utility/struct/voxgig_struct'
require_relative '../core/helpers'

# EJECT-START

  # Change part of an existing EntityName: only the fields given are sent.
  #
  # @param reqdata [EntityNamePatchData, Hash, nil] body data
  # @param ctrl [Object, nil] optional per-call control
  # @return [EntyClass] the patched EntityName entity (data_get reads its record);
  #   raises ProjectNameError on failure
  def patch(reqdata, ctrl = nil)
    utility = @_utility
    ctx = utility.make_context.call({
      "opname" => "patch",
      "ctrl" => ctrl,
      "match" => @_match,
      "data" => @_data,
      "reqdata" => reqdata,
    }, @_entctx)

    _run_op(ctx) do
      if ctx.result
        @_match = ctx.result.resmatch if ctx.result.resmatch
        if ctx.result.resdata
          @_data = ProjectNameHelpers.to_map(VoxgigStruct.clone(ctx.result.resdata)) || {}
        end
      end
    end
  end

# EJECT-END
