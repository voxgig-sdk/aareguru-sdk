package utility

import (
	vs "github.com/voxgig/struct"

	"GOMODULE/core"
)

const headerAuth = "authorization"
const optionApikey = "apikey"
const notFound = "__NOTFOUND__"

func prepareAuthUtil(ctx *core.Context) (*core.Spec, error) {
	spec := ctx.Spec
	if spec == nil {
		return nil, ctx.MakeError("auth_no_spec",
			"Expected context spec property to be defined.")
	}

	headers := spec.Headers
	options := ctx.Client.OptionsMap()

	apikey := vs.GetProp(options, optionApikey, notFound)

	if apikeyStr, ok := apikey.(string); ok && apikeyStr == notFound {
		delete(headers, headerAuth)
	} else {
		authPrefix := ""
		if ap := vs.GetPath([]any{"auth", "prefix"}, options); ap != nil {
			authPrefix, _ = ap.(string)
		}
		apikeyVal := ""
		if av, ok := apikey.(string); ok {
			apikeyVal = av
		}
		headers[headerAuth] = authPrefix + " " + apikeyVal
	}

	return spec, nil
}
