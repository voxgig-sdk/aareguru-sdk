package utility

import (
	"regexp"
	"strings"

	vs "github.com/voxgig/struct"

	"GOMODULE/core"
)

// How many path segments a point has.
func partsLen(point map[string]any) int {
	if parts, ok := vs.GetProp(point, "parts").([]any); ok {
		return len(parts)
	}
	return 0
}

// Does this point's path end in a parameter? A record route ends in the
// record's identifier (`/boards/{id}`); a cross-reference that also returns
// the entity ends in the relationship's name (`/posts/{id}/author`).
func terminalParam(point map[string]any) bool {
	parts, ok := vs.GetProp(point, "parts").([]any)
	if !ok || 0 == len(parts) {
		return false
	}
	last, _ := parts[len(parts)-1].(string)
	return strings.HasPrefix(last, "{")
}

func ownPoint(points []map[string]any) map[string]any {
	best := points[0]
	for _, cand := range points {
		candTerm := terminalParam(cand)
		bestTerm := terminalParam(best)
		if candTerm != bestTerm {
			if candTerm {
				best = cand
			}
		} else if partsLen(cand) < partsLen(best) {
			best = cand
		}
	}
	return best
}

var pathParamRe = regexp.MustCompile(`^\{([^{}/]+)\}$`)

// The path parameters of a point that neither the call nor the entity gives
// a value for, looked up as prepareParamsUtil looks them up.
func unfilledParams(ctx *core.Context, point map[string]any) []string {
	missing := []string{}
	parts, _ := vs.GetProp(point, "parts").([]any)
	for _, part := range parts {
		text, _ := part.(string)
		found := pathParamRe.FindStringSubmatch(text)
		if nil == found {
			continue
		}
		if nil == paramValue(ctx, point, found[1]) {
			missing = append(missing, found[1])
		}
	}
	return missing
}

func makePointUtil(ctx *core.Context) (map[string]any, error) {
	if ctx.Out["point"] != nil {
		// A PrePoint feature hook (e.g. rbac) may short-circuit the
		// operation by storing an error here; surface it before any
		// endpoint resolution or network activity.
		if err, ok := ctx.Out["point"].(error); ok {
			return nil, err
		}
		if tm, ok := ctx.Out["point"].(map[string]any); ok {
			ctx.Point = tm
			return tm, nil
		}
	}

	op := ctx.Op
	options := ctx.Options

	allowOpVal := vs.GetPath(options, []any{"allow", "op"})
	allowOp, _ := allowOpVal.(string)
	if !core.Allowed(allowOpVal, op.Name) {
		return nil, ctx.MakeError("point_op_allow",
			"Operation \""+op.Name+
				"\" not allowed by SDK option allow.op value: \""+allowOp+"\"")
	}

	if len(op.Points) == 0 {
		return nil, ctx.MakeError("point_no_points",
			"Operation \""+op.Name+"\" has no endpoint definitions.")
	}

	if len(op.Points) == 1 {
		ctx.Point = op.Points[0]
	} else {
		var reqselector map[string]any
		var selector map[string]any

		if op.Input == "data" {
			reqselector = ctx.Reqdata
			selector = ctx.Data
		} else {
			reqselector = ctx.Reqmatch
			selector = ctx.Match
		}

		var point map[string]any
		matched := false
		for i := 0; i < len(op.Points); i++ {
			cand := op.Points[i]
			selectDef := core.ToMapAny(vs.GetProp(cand, "select"))
			found := true

			if selector != nil && selectDef != nil {
				if exist := vs.GetProp(selectDef, "exist"); exist != nil {
					if existList, ok := exist.([]any); ok {
						for _, ek := range existList {
							existkey, _ := ek.(string)
							rv := vs.GetProp(reqselector, existkey)
							sv := vs.GetProp(selector, existkey)
							if rv == nil && sv == nil {
								found = false
								break
							}
						}
					}
				}
			}

			if found {
				reqAction := vs.GetProp(reqselector, "$action")
				selectAction := vs.GetProp(selectDef, "$action")
				if reqAction != selectAction {
					found = false
				}
			}

			if found {
				point = cand
				matched = true
				break
			}
		}

		// select.exist can list more than the params needed to pick a point,
		// so nothing matches — fall back to the entity's own route rather
		// than whichever point came last.
		if !matched {
			if reqselector != nil && vs.GetProp(reqselector, "$action") != nil {
				return nil, ctx.MakeError("point_action_invalid",
					"Operation \""+op.Name+
						"\" action \""+vs.Stringify(vs.GetProp(reqselector, "$action"))+
						"\" is not valid.")
			}

			// A call without an action falls back to a point without one, as
			// generation does, and only to a route the call can fill.
			plain := []map[string]any{}
			for _, cand := range op.Points {
				if nil == vs.GetProp(vs.GetProp(cand, "select"), "$action") {
					plain = append(plain, cand)
				}
			}
			if 0 == len(plain) {
				return nil, ctx.MakeError("point_action_required",
					"Operation \""+op.Name+
						"\" has only action endpoints; pass $action to choose one.")
			}
			fillable := []map[string]any{}
			for _, cand := range plain {
				if 0 == len(unfilledParams(ctx, cand)) {
					fillable = append(fillable, cand)
				}
			}

			if 0 == len(fillable) {
				return nil, ctx.MakeError("point_no_match",
					"Operation \""+op.Name+
						"\" has no endpoint whose path parameters are all given (missing: "+
						strings.Join(unfilledParams(ctx, ownPoint(plain)), ", ")+").")
			}

			point = ownPoint(fillable)
		}

		if reqselector != nil {
			reqAction := vs.GetProp(reqselector, "$action")
			if reqAction != nil && point != nil {
				pointSelect := core.ToMapAny(vs.GetProp(point, "select"))
				pointAction := vs.GetProp(pointSelect, "$action")
				if reqAction != pointAction {
					return nil, ctx.MakeError("point_action_invalid",
						"Operation \""+op.Name+
							"\" action \""+vs.Stringify(reqAction)+"\" is not valid.")
				}
			}
		}

		ctx.Point = point
	}

	return ctx.Point, nil
}
