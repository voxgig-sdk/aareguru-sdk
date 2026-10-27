package utility

import (
	vs "github.com/voxgig/struct"

	"GOMODULE/core"
)

func paramUtil(ctx *core.Context, paramdef any) any {
	pt := vs.Typify(paramdef)

	var key string
	if 0 < (vs.T_string & pt) {
		key, _ = paramdef.(string)
	} else {
		k := vs.GetProp(paramdef, "name")
		key, _ = k.(string)
	}

	akey := paramAlias(ctx.Point, key)
	if ctx.Spec != nil && akey != "" &&
		nil == vs.GetProp(ctx.Reqmatch, key) && nil == vs.GetProp(ctx.Match, key) {
		ctx.Spec.Alias[akey] = key
	}

	return paramValue(ctx, ctx.Point, key)
}

// The name a point gives a parameter in the call, if it renames it.
func paramAlias(point map[string]any, key string) string {
	if point != nil {
		alias := core.ToMapAny(vs.GetProp(point, "alias"))
		if alias != nil {
			if ak, ok := vs.GetProp(alias, key).(string); ok {
				return ak
			}
		}
	}
	return ""
}

// The value the call or its entity gives a point's parameter, under its name
// or the point's alias for it.
func paramValue(ctx *core.Context, point map[string]any, key string) any {
	akey := paramAlias(point, key)

	val := vs.GetProp(ctx.Reqmatch, key)

	if val == nil {
		val = vs.GetProp(ctx.Match, key)
	}

	if val == nil && akey != "" {
		val = vs.GetProp(ctx.Reqmatch, akey)
	}

	if val == nil {
		val = vs.GetProp(ctx.Reqdata, key)
	}

	if val == nil {
		val = vs.GetProp(ctx.Data, key)
	}

	if val == nil && akey != "" {
		val = vs.GetProp(ctx.Reqdata, akey)
		if val == nil {
			val = vs.GetProp(ctx.Data, akey)
		}
	}

	return val
}

// One argument a point declares, with the name it travels under and the
// value the call passes for it.
type callArg struct {
	name string
	wire string
	val  any
}

// The arguments a point declares in one location, query or header, each with
// the name it travels under and the value this call passes in its match or
// else its data. Unlike a path parameter, the entity's stored match and data
// never supply one.
func callArgs(ctx *core.Context, kind string) []callArg {
	out := []callArg{}
	if al, ok := vs.GetPath(ctx.Point, []any{"args", kind}).([]any); ok {
		for _, ad := range al {
			name, _ := vs.GetProp(ad, "name").(string)
			if "" == name {
				continue
			}
			wire, _ := vs.GetProp(ad, "orig").(string)
			if "" == wire {
				wire = name
			}
			val := vs.GetProp(ctx.Reqmatch, name)
			if val == nil {
				val = vs.GetProp(ctx.Reqdata, name)
			}
			out = append(out, callArg{name: name, wire: wire, val: val})
		}
	}
	return out
}
