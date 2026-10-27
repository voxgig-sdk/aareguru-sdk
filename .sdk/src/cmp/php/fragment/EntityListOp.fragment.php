// EJECT-START

    /**
     * List EntityName items matching the given filter.
     *
     * @param EntityNameListMatch|array|null $reqmatch Match filter (any subset
     *   of EntityName fields) as an assoc-array; EntityNameListMatch names the shape.
     * @param mixed $ctrl Optional per-call control overrides.
     * @return EntyClass[] The EntityName entities, one per record, each read
     *   with data_get(); throws ProjectNameError on failure (item-5 convention).
     */
    public function list(?array $reqmatch = null, $ctrl = null): mixed
    {
        $utility = $this->_utility;
        $ctx = ($utility->make_context)([
            "opname" => "list",
            "ctrl" => $ctrl,
            "match" => $this->_match,
            "data" => $this->_data,
            "reqmatch" => $reqmatch,
        ], $this->_entctx);

        return $this->_run_op($ctx, function () use ($ctx) {
            if ($ctx->result) {
                if ($ctx->result->resmatch) {
                    $this->_match = $ctx->result->resmatch;
                }
            }
        });
    }

// EJECT-END
