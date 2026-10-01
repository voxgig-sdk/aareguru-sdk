package utility

import (
	"strings"

	vs "github.com/voxgig/struct"

	"GOMODULE/core"
)

func prepareHeadersUtil(ctx *core.Context) map[string]any {
	options := ctx.Client.OptionsMap()

	out := map[string]any{}
	if headers := vs.GetProp(options, "headers"); headers != nil {
		if om, ok := vs.Clone(headers).(map[string]any); ok {
			out = om
		}
	}

	// A header parameter travels as a header, under the name the definition
	// gives it, and only from this call's own arguments. It replaces a default
	// of the same name, whatever its case.
	if hl, ok := vs.GetPath(ctx.Point, []any{"args", "header"}).([]any); ok {
		for _, hd := range hl {
			name, _ := vs.GetProp(hd, "name").(string)
			orig, _ := vs.GetProp(hd, "orig").(string)
			if "" == name {
				continue
			}
			if "" == orig {
				orig = name
			}
			val := vs.GetProp(ctx.Reqmatch, name)
			if val == nil {
				val = vs.GetProp(ctx.Reqdata, name)
			}
			if val != nil {
				wire := strings.ToLower(orig)
				for key := range out {
					if strings.ToLower(key) == wire {
						delete(out, key)
					}
				}
				out[wire] = vs.Stringify(val)
			}
		}
	}

	return out
}
