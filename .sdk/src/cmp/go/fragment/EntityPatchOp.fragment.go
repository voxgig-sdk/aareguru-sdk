package entity

import (
	"GOMODULE/core"

	vs "github.com/voxgig/struct"
)

type entityPatchOp struct{}

// EJECT-START

func (e *EntyClass) Patch(reqdata map[string]any, ctrl map[string]any) (any, error) {
	utility := e.utility
	ctx := utility.MakeContext(map[string]any{
		"opname":  "patch",
		"ctrl":    ctrl,
		"match":   e.match,
		"data":    e.data,
		"reqdata": reqdata,
	}, e.entctx)

	return e.runOp(ctx, func() {
		if ctx.Result != nil {
			if ctx.Result.Resmatch != nil {
				e.match = ctx.Result.Resmatch
			}
			if ctx.Result.Resdata != nil {
				e.data = map[string]any{}
				if data := core.ToMapAny(vs.Clone(ctx.Result.Resdata)); data != nil {
					e.data = data
				}
			}
		}
	})
}

// PatchTyped is the statically-typed variant of Patch: it takes an
// EntityNamePatchData and returns an EntityName. It delegates to the untyped
// Patch (identical runtime) and converts at the typed boundary.
func (e *EntyClass) PatchTyped(reqdata EntityNamePatchData, ctrl map[string]any) (EntityName, error) {
	res, err := e.Patch(asMap(reqdata), ctrl)
	if err != nil {
		return EntityName{}, err
	}
	return typedFrom[EntityName](res), nil
}

// EJECT-END
