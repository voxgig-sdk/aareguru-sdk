package utility

import (
	"reflect"
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
	out = mediaHeaders(ctx.Point, out)

	// A header argument replaces a default of the same name, whatever its case.
	for _, arg := range callArgs(ctx, "header") {
		if arg.val != nil {
			wire := strings.ToLower(arg.wire)
			for key := range out {
				if strings.ToLower(key) == wire {
					delete(out, key)
				}
			}
			out[wire] = vs.Stringify(arg.val)
		}
	}

	// A cookie argument travels in the cookie header, form serialized and
	// percent-encoded, replacing a cookie of the same name among those the
	// caller's headers already send.
	sent := []callArg{}
	for _, arg := range callArgs(ctx, "cookie") {
		if arg.val != nil {
			sent = append(sent, arg)
		}
	}
	if 0 < len(sent) {
		names := map[string]bool{}
		for _, arg := range sent {
			for _, name := range cookieNames(arg) {
				names[name] = true
			}
		}
		kept := []string{}
		for key, val := range out {
			if strings.ToLower(key) != "cookie" {
				continue
			}
			if given, ok := val.(string); ok {
				kept = append(kept, cookieKeep(given, names)...)
			}
			delete(out, key)
		}
		for _, arg := range sent {
			if pair := cookiePair(arg.wire, arg.val); "" != pair {
				kept = append(kept, pair)
			}
		}
		if 0 < len(kept) {
			out["cookie"] = strings.Join(kept, "; ")
		}
	}

	return out
}

// The cookie names an argument sends: a map's own keys as the pair sends
// them, percent-encoded, else its wire name.
func cookieNames(arg callArg) []string {
	if m, ok := cookieMap(arg.val); ok {
		names := []string{}
		for _, key := range vs.KeysOf(m) {
			names = append(names, vs.EscUrl(key))
		}
		return names
	}
	return []string{arg.wire}
}

// A map argument as the port reads one, a typed map with string keys included:
// IsList takes any slice, while IsMap takes map[string]any alone.
func cookieMap(val any) (map[string]any, bool) {
	if vs.IsMap(val) {
		return val.(map[string]any), true
	}
	rv := reflect.ValueOf(val)
	if !rv.IsValid() || rv.Kind() != reflect.Map || rv.Type().Key().Kind() != reflect.String {
		return nil, false
	}
	out := map[string]any{}
	for _, key := range rv.MapKeys() {
		out[key.String()] = rv.MapIndex(key).Interface()
	}
	return out, true
}

// The form style of a cookie parameter: a list repeats the name, a map sends
// its own keys, and every value is percent-encoded.
func cookiePair(wire string, val any) string {
	esc := func(v any) string { return vs.EscUrl(vs.Stringify(v)) }
	pairs := []string{}
	m, ismap := cookieMap(val)
	switch {
	case vs.IsList(val):
		for _, item := range vs.Items(val) {
			pairs = append(pairs, wire+"="+esc(item[1]))
		}
	case ismap:
		for _, key := range vs.KeysOf(m) {
			pairs = append(pairs, vs.EscUrl(key)+"="+esc(vs.GetProp(m, key)))
		}
	default:
		pairs = append(pairs, wire+"="+esc(val))
	}
	return strings.Join(pairs, "; ")
}

// The caller's cookie pieces with the named cookies removed: a cookie is one
// ;-delimited piece, whatever its value holds.
func cookieKeep(header string, names map[string]bool) []string {
	kept := []string{}
	for _, piece := range strings.Split(header, ";") {
		cookie := strings.TrimSpace(piece)
		if "" != cookie && !names[strings.TrimSpace(strings.SplitN(cookie, "=", 2)[0])] {
			kept = append(kept, cookie)
		}
	}
	return kept
}
