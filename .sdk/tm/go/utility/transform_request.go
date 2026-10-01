package utility

import (
	vs "github.com/voxgig/struct"

	"GOMODULE/core"
)

func transformRequestUtil(ctx *core.Context) any {
	spec := ctx.Spec
	point := ctx.Point

	if spec != nil {
		spec.Step = "reqform"
	}

	data := omitKeys(ctx.Reqdata, headerArgNames(point))

	transform := core.ToMapAny(vs.GetProp(point, "transform"))
	if transform == nil {
		return stripAction(data)
	}

	reqform := vs.GetProp(transform, "req")
	if reqform == nil {
		return stripAction(data)
	}

	reqdata, terr := vs.Transform(map[string]any{
		"reqdata": data,
	}, reqform)

	if terr != nil {
		if ctx.Ctrl != nil && ctx.Ctrl.Throw != nil && !*ctx.Ctrl.Throw {
			out, _ := makeErrorUtil(ctx, terr)
			return out
		}
		return terr
	}

	return stripAction(reqdata)
}

// `$action` selects the point (see makePointUtil); it is never an API field,
// so the body is a copy without it. The caller's map is left untouched.
func stripAction(reqdata any) any {
	return omitKeys(reqdata, []string{"$action"})
}

// A header argument travels as a header, which prepareHeadersUtil sends, so
// the body is built from the request data without it.
func headerArgNames(point any) []string {
	names := []string{}
	if hl, ok := vs.GetPath(point, []any{"args", "header"}).([]any); ok {
		for _, hd := range hl {
			if name, _ := vs.GetProp(hd, "name").(string); "" != name {
				names = append(names, name)
			}
		}
	}
	return names
}

func omitKeys(reqdata any, names []string) any {
	src, ok := reqdata.(map[string]any)
	if !ok {
		return reqdata
	}
	skip := map[string]bool{}
	for _, name := range names {
		if _, has := src[name]; has {
			skip[name] = true
		}
	}
	if 0 == len(skip) {
		return reqdata
	}
	body := make(map[string]any, len(src))
	for k, v := range src {
		if !skip[k] {
			body[k] = v
		}
	}
	return body
}
