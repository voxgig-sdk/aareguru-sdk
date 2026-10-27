package utility

import (
	"reflect"

	vs "github.com/voxgig/struct"

	"GOMODULE/core"
)

func makeSpecUtil(ctx *core.Context) (*core.Spec, error) {
	if ctx.Out["spec"] != nil {
		// A PreSpec hook (validate) rejects the operation by placing its error
		// here; the pipeline raises it, and ctx.Spec stays a request spec.
		if err, ok := ctx.Out["spec"].(error); ok {
			return nil, err
		}
		if sp, ok := ctx.Out["spec"].(*core.Spec); ok {
			ctx.Spec = sp
			return sp, nil
		}
	}

	point := ctx.Point
	options := ctx.Options
	utility := ctx.Utility

	base, _ := vs.GetProp(options, "base").(string)
	prefix, _ := vs.GetProp(options, "prefix").(string)
	suffix, _ := vs.GetProp(options, "suffix").(string)

	var parts []any
	if p := vs.GetProp(point, "parts"); p != nil {
		if pl, ok := p.([]any); ok {
			parts = pl
		}
	}

	ctx.Spec = core.NewSpec(map[string]any{
		"base":   base,
		"prefix": prefix,
		"parts":  parts,
		"suffix": suffix,
		"step":   "start",
	})

	ctx.Spec.Method = utility.PrepareMethod(ctx)

	allowMethodVal := vs.GetPath(options, []any{"allow", "method"})
	allowMethod, _ := allowMethodVal.(string)
	if !core.Allowed(allowMethodVal, ctx.Spec.Method) {
		return nil, ctx.MakeError("spec_method_allow",
			"Method \""+ctx.Spec.Method+
				"\" not allowed by SDK option allow.method value: \""+allowMethod+"\"")
	}

	ctx.Spec.Params = utility.PrepareParams(ctx)
	ctx.Spec.Query = utility.PrepareQuery(ctx)
	ctx.Spec.Headers = utility.PrepareHeaders(ctx)

	kind, _ := vs.GetProp(point, "kind").(string)

	if kind == "graphql" {
		ctx.Spec.Body = utility.GraphqlBody(ctx)
		ctx.Spec.Path = ""
		// PrepareQuery already copied the op's match arguments into the
		// query string. Those same values are bound as operation
		// variables, so leaving them would send /graphql?id=i1.
		ctx.Spec.Query = map[string]any{}
		ctx.Spec.Headers["content-type"] = GraphqlContentType
	} else {
		ctx.Spec.Body = utility.PrepareBody(ctx)

		if berr, isErr := ctx.Spec.Body.(error); isErr {
			return nil, berr
		}

		ctx.Spec.Path = utility.PreparePath(ctx)
	}

	if ctx.Ctrl.Explain != nil {
		ctx.Ctrl.Explain["spec"] = ctx.Spec
	}

	// Whatever PrepareAuth sets in the query, under whichever name, is the
	// credential; a key it leaves as it was is the caller's.
	query := map[string]any{}
	for k, v := range ctx.Spec.Query {
		query[k] = v
	}

	spec, err := utility.PrepareAuth(ctx)
	if err != nil {
		return nil, err
	}

	spec.AuthQuery = []string{}
	for k, v := range spec.Query {
		if prev, had := query[k]; !had || !reflect.DeepEqual(prev, v) {
			spec.AuthQuery = append(spec.AuthQuery, k)
		}
	}

	ctx.Spec = spec
	return spec, nil
}
