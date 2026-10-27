require_once __DIR__ . '/../utility/struct/Struct.php';
require_once __DIR__ . '/../core/Helpers.php';

// EJECT-START

    /**
     * Change part of an existing EntityName: only the fields given are sent.
     *
     * @param EntityNamePatchData|array|null $reqdata Body data as an assoc-array;
     *   a typed EntityNamePatchData names the shape.
     * @param mixed $ctrl Optional per-call control overrides.
     * @return EntyClass The patched EntityName entity, whose data_get() reads
     *   its record; throws ProjectNameError on failure (item-5 convention).
     */
    public function patch(?array $reqdata = null, $ctrl = null): mixed
    {
        $utility = $this->_utility;
        $ctx = ($utility->make_context)([
            "opname" => "patch",
            "ctrl" => $ctrl,
            "match" => $this->_match,
            "data" => $this->_data,
            "reqdata" => $reqdata,
        ], $this->_entctx);

        return $this->_run_op($ctx, function () use ($ctx) {
            if ($ctx->result) {
                if ($ctx->result->resmatch) {
                    $this->_match = $ctx->result->resmatch;
                }
                if ($ctx->result->resdata) {
                    $this->_data = ProjectNameHelpers::to_map(Struct::clone($ctx->result->resdata)) ?? [];
                }
            }
        });
    }

// EJECT-END
