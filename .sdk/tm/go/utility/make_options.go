package utility

import (
	"encoding/json"
	"regexp"
	"sort"
	"strings"

	vs "github.com/voxgig/struct"

	"GOMODULE/core"
)

// {name} placeholders in a templated server URL (OpenAPI server variables).
var serverVarRe = regexp.MustCompile(`\{[A-Za-z0-9_]+\}`)

func canonNumbers(node any) {
	switch n := node.(type) {
	case map[string]any:
		for k, v := range n {
			if num, ok := v.(json.Number); ok {
				n[k] = canonNumber(num)
			} else {
				canonNumbers(v)
			}
		}
	case []any:
		for i, v := range n {
			if num, ok := v.(json.Number); ok {
				n[i] = canonNumber(num)
			} else {
				canonNumbers(v)
			}
		}
	}
}

func canonNumber(n json.Number) any {
	if i, err := n.Int64(); err == nil {
		return i
	}
	if f, err := n.Float64(); err == nil {
		return f
	}
	return n
}

func makeOptionsUtil(ctx *core.Context) map[string]any {
	options := ctx.Options
	if options == nil {
		options = map[string]any{}
	}

	if customUtils := core.ToMapAny(options["utility"]); customUtils != nil {
		utility := ctx.Utility
		if utility != nil {
			for key, val := range customUtils {
				if !overrideUtil(utility, key, val) {
					utility.Custom[key] = val
				}
			}
		}
	}

	authval, authgiven := options["auth"]
	authsuppressed := authgiven && authval == nil

	opts := vs.Clone(options).(map[string]any)

	config := ctx.Config
	if config == nil {
		config = map[string]any{}
	}
	cfgopts := map[string]any{}
	if co, ok := config["options"]; ok && co != nil {
		if cm, ok := co.(map[string]any); ok {
			cfgopts = cm
		}
	}

	// The secret registry exists BEFORE validation, fed from the raw input, so
	// the constructor's own rejection of a mistyped credential is clean too.
	cleanraw := map[string]any{}
	for _, layer := range []any{core.OPTSPEC["clean"], cfgopts["clean"], opts["clean"]} {
		for k, v := range core.ToMapAny(layer) {
			cleanraw[k] = v
		}
	}
	cleancfg := makeCleanConfig(cleanraw)
	cleanctx := &core.Context{Options: map[string]any{
		"__derived__": map[string]any{"clean": cleancfg},
	}}
	cleanAddOptions(cleanctx, cleanOmit(opts, "clean"))
	for _, block := range []map[string]any{cfgopts, opts} {
		for _, s := range cleanSplit(vs.GetPath(block, []any{"clean", "values"})) {
			cleancfg.add(s)
		}
	}

	var featureorder []any
	if farr, ok := opts["feature"].([]any); ok {
		fmap := map[string]any{}
		for _, entry := range farr {
			em := core.ToMapAny(entry)
			if em == nil {
				continue
			}
			name, _ := em["name"].(string)
			if name == "" {
				continue
			}
			fopts := map[string]any{}
			for k, v := range em {
				if k != "name" {
					fopts[k] = v
				}
			}
			fmap[name] = fopts
			featureorder = append(featureorder, name)
		}
		opts["feature"] = fmap
	}

	optspec := core.OPTSPEC

	// Preserve system.fetch before merge/validate.
	var sysFetch any
	if sf := vs.GetPath(opts, []any{"system", "fetch"}); sf != nil {
		sysFetch = sf
	}

	// Clone the config side before merging: `config` is a process-wide
	// singleton (see core.SharedConfig), and Merge would otherwise use its
	// nested maps as merge TARGETS — one instance's options (server, headers,
	// ...) would contaminate every instance constructed after it.
	merged := vs.Merge([]any{map[string]any{}, vs.Clone(cfgopts), opts})

	// To reflect a json.Number is a string, so the validator refuses one where
	// the feature readers accept it. Canonicalise first: options decoded with
	// UseNumber() are otherwise judged by a rule nothing else applies.
	canonNumbers(merged)

	validated, _ := vs.Validate(merged, optspec)
	opts = validated.(map[string]any)

	// Restore the suppression the optspec default would otherwise erase.
	if authsuppressed {
		opts["auth"] = nil
	}

	if base, ok := opts["base"].(string); ok && strings.Contains(base, "{") {
		testmode := false
		if ta, ok := vs.GetPath(opts, []any{"test", "active"}).(bool); ok && ta {
			testmode = true
		}
		if fa, ok := vs.GetPath(opts, []any{"feature", "test", "active"}).(bool); ok && fa {
			testmode = true
		}
		server := core.ToMapAny(opts["server"])
		sdkname := "SDK"
		if mn, ok := vs.GetPath(config, []any{"main", "name"}).(string); ok && mn != "" {
			sdkname = mn
		}
		resolved := serverVarRe.ReplaceAllStringFunc(base, func(ph string) string {
			name := ph[1 : len(ph)-1]
			val, _ := server[name].(string)
			if val == "" {
				if testmode {
					return "test-" + name
				}
				panic(sdkname + ": the server variable '" + name + "' is required: " +
					"the API base URL is '" + base + "' — pass " +
					`options["server"].(map)["` + name + `"] in the SDK options`)
			}
			return val
		})
		opts["base"] = resolved
	}

	// Restore system.fetch.
	if sysFetch != nil {
		if sys, ok := opts["system"]; ok {
			if sm, ok := sys.(map[string]any); ok {
				sm["fetch"] = sysFetch
			}
		} else {
			opts["system"] = map[string]any{"fetch": sysFetch}
		}
	}

	// Resolve the feature add-order: an explicit array order (above) wins;
	// otherwise order the map test-first, then the remaining names sorted, so
	// the outcome is deterministic and `test` is always the base transport.
	if len(featureorder) == 0 {
		fmap := core.ToMapAny(opts["feature"])
		names := make([]string, 0, len(fmap))
		for k := range fmap {
			names = append(names, k)
		}
		sort.Strings(names)
		hasTest := false
		for _, n := range names {
			if n == "test" {
				hasTest = true
			}
		}
		ordered := make([]string, 0, len(names))
		if hasTest {
			ordered = append(ordered, "test")
			for _, n := range names {
				if n != "test" {
					ordered = append(ordered, n)
				}
			}
		} else {
			ordered = append(ordered, names...)
		}
		si := -1
		for i, n := range ordered {
			if n == "station" {
				si = i
				break
			}
		}
		if si >= 0 {
			ordered = append(ordered[:si], ordered[si+1:]...)
			ti := 0
			for i, n := range ordered {
				if n == "test" {
					ti = i + 1
					break
				}
			}
			ordered = append(ordered[:ti],
				append([]string{"station"}, ordered[ti:]...)...)
		}
		for _, n := range ordered {
			featureorder = append(featureorder, n)
		}
	}

	opts["__derived__"] = map[string]any{
		"clean":        cleancfg,
		"featureorder": featureorder,
	}

	// Again over the merged result: the config's own defaults can carry one.
	cleanAddOptions(cleanctx, cleanOmit(opts, "clean", "__derived__"))

	return opts
}

// A feature's name is not a field name: only the sensitive names inside its
// settings count, so `secrets` does not make every setting a secret. Entity
// blocks (per-entity settings, seeded records) hold no credential, and nor do
// rbac's rules, keyed by entity and operation names.
func cleanAddOptions(ctx *core.Context, opts map[string]any) {
	top := cleanOmit(opts, "feature", "entity")
	if test, ok := top["test"]; ok {
		top["test"] = cleanPlain(test, "")
	}
	cleanAddSensitive(ctx, top)
	switch feature := opts["feature"].(type) {
	case map[string]any:
		for name, fopts := range feature {
			cleanAddSensitive(ctx, cleanPlain(fopts, name))
		}
	case []any:
		for _, entry := range feature {
			m, _ := entry.(map[string]any)
			name, _ := m["name"].(string)
			cleanAddSensitive(ctx, cleanPlain(entry, name))
		}
	default:
		cleanAddSensitive(ctx, feature)
	}
}

func cleanPlain(block any, name string) any {
	if m, ok := block.(map[string]any); ok {
		if "rbac" == name {
			return cleanOmit(m, "entity", "rules")
		}
		return cleanOmit(m, "entity")
	}
	return block
}

func cleanOmit(m map[string]any, keys ...string) map[string]any {
	out := make(map[string]any, len(m))
	for k, v := range m {
		out[k] = v
	}
	for _, k := range keys {
		delete(out, k)
	}
	return out
}
