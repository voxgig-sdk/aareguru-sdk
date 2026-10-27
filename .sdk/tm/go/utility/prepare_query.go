package utility

import (
	vs "github.com/voxgig/struct"

	"GOMODULE/core"
)

func prepareQueryUtil(ctx *core.Context) map[string]any {
	point := ctx.Point
	reqmatch := ctx.Reqmatch
	if reqmatch == nil {
		reqmatch = map[string]any{}
	}

	var params []any
	if point != nil {
		if p := vs.GetProp(point, "params"); p != nil {
			if pl, ok := p.([]any); ok {
				params = append([]any{}, pl...)
			}
		}
	}
	if params == nil {
		params = []any{}
	}

	// A path parameter travels in the path. The generated config lists them as
	// args.params, which prepareParams reads; params is the older list of names.
	if point != nil {
		if pl, ok := vs.GetPath(point, []any{"args", "params"}).([]any); ok {
			for _, pd := range pl {
				if name, ok := vs.GetProp(pd, "name").(string); ok {
					params = append(params, name)
				}
			}
		}
	}

	// A header or cookie parameter travels in the headers, which prepareHeaders
	// fills, unless a query parameter shares its name: then both are sent.
	if point != nil {
		declared := map[string]bool{}
		if ql, ok := vs.GetPath(point, []any{"args", "query"}).([]any); ok {
			for _, qd := range ql {
				if name, ok := vs.GetProp(qd, "name").(string); ok {
					declared[name] = true
				}
			}
		}
		if hl, ok := vs.GetPath(point, []any{"args", "header"}).([]any); ok {
			for _, hd := range hl {
				if name, ok := vs.GetProp(hd, "name").(string); ok && !declared[name] {
					params = append(params, name)
				}
			}
		}
		if cl, ok := vs.GetPath(point, []any{"args", "cookie"}).([]any); ok {
			for _, cd := range cl {
				if name, ok := vs.GetProp(cd, "name").(string); ok && !declared[name] {
					params = append(params, name)
				}
			}
		}
	}

	// A query parameter travels under the name the definition gives it, its
	// orig, which the model may have renamed for the caller.
	wire := map[string]string{}
	if point != nil {
		if ql, ok := vs.GetPath(point, []any{"args", "query"}).([]any); ok {
			for _, qd := range ql {
				name, _ := vs.GetProp(qd, "name").(string)
				orig, _ := vs.GetProp(qd, "orig").(string)
				if "" != name && "" != orig {
					wire[name] = orig
				}
			}
		}
	}

	out := map[string]any{}
	for _, item := range vs.Items(reqmatch) {
		key, _ := item[0].(string)
		val := item[1]
		if val != nil && key != "$action" && !containsStr(params, key) {
			if orig, ok := wire[key]; ok {
				key = orig
			}
			out[key] = val
		}
	}

	// A create or update passes its query arguments in its data.
	for _, arg := range callArgs(ctx, "query") {
		if arg.val != nil && !containsStr(params, arg.name) {
			out[arg.wire] = arg.val
		}
	}

	return out
}

func containsStr(list []any, s string) bool {
	for _, v := range list {
		if vs, ok := v.(string); ok && vs == s {
			return true
		}
	}
	return false
}
