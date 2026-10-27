# EJECT-START

  # List EntityName items matching the given filter.
  #
  # @param reqmatch [EntityNameListMatch, Hash, nil] match filter (any subset of
  #   EntityName fields); defaults to nil, treated as an empty match that lists all.
  # @param ctrl [Object, nil] optional per-call control
  # @return [Array<EntyClass>] the matching EntityName items, one entity per
  #   record (data_get reads the record); raises ProjectNameError on failure
  def list(reqmatch = nil, ctrl = nil)
    utility = @_utility
    ctx = utility.make_context.call({
      "opname" => "list",
      "ctrl" => ctrl,
      "match" => @_match,
      "data" => @_data,
      "reqmatch" => reqmatch,
    }, @_entctx)

    records = _run_op(ctx) do
      if ctx.result
        @_match = ctx.result.resmatch if ctx.result.resmatch
      end
    end

    records
  end

# EJECT-END
