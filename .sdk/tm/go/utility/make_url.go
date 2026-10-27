package utility

import (
	"regexp"
	"strings"

	vs "github.com/voxgig/struct"

	"GOMODULE/core"
)

var placeholderRe = regexp.MustCompile(`\{[^{}/]+\}`)

func makeUrlUtil(ctx *core.Context) (string, error) {
	spec := ctx.Spec
	result := ctx.Result

	if spec == nil {
		return "", ctx.MakeError("url_no_spec",
			"Expected context spec property to be defined.")
	}
	if result == nil {
		return "", ctx.MakeError("url_no_result",
			"Expected context result property to be defined.")
	}

	url := vs.Join([]any{spec.Base, spec.Prefix, spec.Path, spec.Suffix}, "/", true)
	resmatch := map[string]any{}

	// A route the definition ends with a slash keeps it, for a Django REST server,
	// and a host with no path takes /, or luasocket reads a query as the host.
	if orig, _ := vs.GetProp(ctx.Point, "orig").(string); strings.HasSuffix(orig, "/") &&
		spec.Suffix == "" && !strings.HasSuffix(url, "/") {
		url += "/"
	}
	if authority := strings.Index(url, "://"); 0 < authority && !strings.ContainsAny(url[authority+3:], "/?#") {
		url += "/"
	}

	params := spec.Params
	for _, item := range vs.Items(params) {
		key, _ := item[0].(string)
		val := item[1]
		if val != nil {
			// A whole . or .. is a dot segment, which moves the request to another route.
			text := vs.Stringify(val)
			if text == "." || text == ".." {
				return "", ctx.MakeError("url_param_invalid",
					"URL path parameter "+key+" cannot be \""+text+"\".")
			}
			re := regexp.MustCompile("\\{" + vs.EscRe(key) + "\\}")
			url = re.ReplaceAllString(url, vs.EscUrl(text))
			resmatch[key] = val
		}
	}

	// A placeholder left in the route would send the request to the wrong route.
	// The base's own placeholders are server variables, resolved with the options.
	route := strings.TrimPrefix(url, strings.TrimRight(spec.Base, "/"))
	if unfilled := placeholderRe.FindAllString(route, -1); 0 < len(unfilled) {
		return "", ctx.MakeError("url_param_missing",
			"URL path has no value for "+strings.Join(unfilled, ", ")+".")
	}

	// Append query string from spec.Query.
	qsep := "?"
	for _, item := range vs.Items(spec.Query) {
		key, _ := item[0].(string)
		val := item[1]
		if val != nil {
			url += qsep + vs.EscUrl(key) + "=" + vs.EscUrl(vs.Stringify(val))
			qsep = "&"
			if !authQueryHas(spec, key) {
				resmatch[key] = val
			}
		}
	}

	result.Resmatch = resmatch

	return url, nil
}

// Sent with the request, never recorded as the entity's match.
func authQueryHas(spec *core.Spec, key string) bool {
	for _, name := range spec.AuthQuery {
		if name == key {
			return true
		}
	}
	return false
}
