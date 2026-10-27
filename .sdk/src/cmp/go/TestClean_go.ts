import {
  cmp,
  File,
  Content,
  isAuthSuppressed,
  isHttpBasicAuth,
  resolveAuthIn,
  resolveAuthName,
} from '@voxgig/sdkgen'


// The canary sweep: every credential slot holds a distinctive value, every
// diagnostic feature this SDK ships is switched on with a capturing sink, a
// real operation runs through every outcome, and every string that leaves
// the SDK is searched for the canaries and their encoded forms. It also
// proves its own sensitivity: with clean switched off the canary MUST show.
const TestClean = cmp(function TestClean(props: any) {
  const { model } = props.ctx$
  const { target, gomodule } = props

  const auth = {
    suppressed: isAuthSuppressed(model),
    where: resolveAuthIn(model),
    name: 'header' === resolveAuthIn(model)
      ? resolveAuthName(model).toLowerCase() : resolveAuthName(model),
    basic: isHttpBasicAuth(model),
  }

  File({ name: 'clean_test.' + target.ext }, () => Content(render(gomodule, model.const.Name, auth)))
})


function render(gomodule: string, Name: string, auth: {
  suppressed: boolean, where: string, name: string, basic: boolean
}): string {
  return `package sdktest

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/url"
	"reflect"
	"sort"
	"strings"
	"testing"

	sdk "${gomodule}"
	"${gomodule}/core"
)

// Generated: the credential's wire placement is fixed when the SDK is built.
var cleanAuth = struct {
	suppressed bool
	where      string
	name       string
	basic      bool
}{${auth.suppressed}, ${JSON.stringify(auth.where)}, ${JSON.stringify(auth.name)}, ${auth.basic}}

var cleanCanary = map[string]string{
	"apikey": "CANARY-APIKEY-k9x2m7q4p1",
	"secret": "CANARY-SECRET-w3e8r5t2y6",
	"header": "CANARY-HEADER-z1x4c7v0b3",
	"value":  "CANARY-VALUE-n5m8b2v9c4",
	"config": "CANARY-CONFIG-h6j3k8l2m5",
}

const cleanMask = "[redacted]"

// Every form a canary can travel in.
var cleanForms = func() []string {
	out := []string{}
	for _, k := range []string{"apikey", "secret", "header", "value", "config"} {
		v := cleanCanary[k]
		out = append(out, v, base64.StdEncoding.EncodeToString([]byte(v)), url.QueryEscape(v))
	}
	return append(out, base64.StdEncoding.EncodeToString(
		[]byte(cleanCanary["apikey"]+":"+cleanCanary["secret"])))
}()

type cleanSink struct {
	name string
	text string
}

// Header maps keep the caller's spelling; the assertion should not care.
func cleanHeader(m any, name string) any {
	hm, _ := m.(map[string]any)
	for k, v := range hm {
		if strings.EqualFold(k, name) {
			return v
		}
	}
	return nil
}

func cleanLeaks(text string) []string {
	found := []string{}
	for _, f := range cleanForms {
		if strings.Contains(text, f) {
			found = append(found, f)
		}
	}
	return found
}

// The default prints and the JSON form of a value: what a log line, a panic
// message or a structured logger would carry.
func cleanSurfaces(name string, val any) []cleanSink {
	out := []cleanSink{}
	if raw, err := json.Marshal(val); err == nil {
		out = append(out, cleanSink{name + ":json", string(raw)})
	}
	out = append(out,
		cleanSink{name + ":v", fmt.Sprintf("%v", val)},
		cleanSink{name + ":+v", fmt.Sprintf("%+v", val)},
		cleanSink{name + ":#v", fmt.Sprintf("%#v", val)},
	)
	if err, ok := val.(error); ok {
		out = append(out, cleanSink{name + ":message", err.Error()})
	}
	return out
}

// Captures the serialised context from inside the pipeline: what a hook
// author would hand to a logger.
type cleanCapture struct {
	sdk.BaseFeature
	sinks *[]cleanSink
}

func newCleanCapture(sinks *[]cleanSink) *cleanCapture {
	return &cleanCapture{
		BaseFeature: sdk.BaseFeature{Version: "0.0.1", Name: "capture", Active: true},
		sinks:       sinks,
	}
}

func (f *cleanCapture) take(name string, ctx *sdk.Context) {
	*f.sinks = append(*f.sinks, cleanSurfaces(name, ctx)...)
}

func (f *cleanCapture) PreRequest(ctx *sdk.Context)  { f.take("ctx@PreRequest", ctx) }
func (f *cleanCapture) PreResponse(ctx *sdk.Context) { f.take("ctx@PreResponse", ctx) }

// The SDK's own error as a hook reads it, which an observability feature logs.
func (f *cleanCapture) PreUnexpected(ctx *sdk.Context) {
	f.take("ctx@PreUnexpected", ctx)
	if ctx.Ctrl == nil {
		return
	}
	if sdkerr, ok := ctx.Ctrl.Err.(*sdk.${Name}Error); ok {
		*f.sinks = append(*f.sinks, cleanSurfaces("ctrl.err@PreUnexpected", sdkerr)...)
	}
}

// A slog handler that keeps every record, attributes included.
type cleanLogHandler struct {
	name  string
	sinks *[]cleanSink
	attrs []slog.Attr
}

func (h *cleanLogHandler) Enabled(context.Context, slog.Level) bool { return true }

func (h *cleanLogHandler) Handle(_ context.Context, r slog.Record) error {
	rec := map[string]any{"msg": r.Message}
	for _, a := range h.attrs {
		rec[a.Key] = a.Value.Any()
	}
	r.Attrs(func(a slog.Attr) bool {
		rec[a.Key] = a.Value.Any()
		return true
	})
	*h.sinks = append(*h.sinks,
		cleanSurfaces(h.name+"."+strings.ToLower(r.Level.String()), rec)...)
	return nil
}

func (h *cleanLogHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return &cleanLogHandler{
		name:  h.name,
		sinks: h.sinks,
		attrs: append(append([]slog.Attr{}, h.attrs...), attrs...),
	}
}

func (h *cleanLogHandler) WithGroup(string) slog.Handler { return h }

type cleanScenario struct {
	name    string
	respond func(url string, fetchdef map[string]any) (any, error)
}

func cleanResponse(status int, data any, headers map[string]any) map[string]any {
	h := map[string]any{"content-type": "application/json"}
	for k, v := range headers {
		h[k] = v
	}
	statusText := "OK"
	if status >= 400 {
		statusText = "ERR"
	}
	raw, _ := json.Marshal(data)
	return map[string]any{
		"status":     status,
		"statusText": statusText,
		"headers":    h,
		"json":       (func() any)(func() any { return data }),
		"body":       string(raw),
	}
}

var cleanScenarios = []cleanScenario{
	{"ok", func(string, map[string]any) (any, error) {
		return cleanResponse(200, map[string]any{"id": "i1", "name": "n1"},
			map[string]any{"x-session-token": "RESP-TOKEN-a1b2c3d4e5"}), nil
	}},
	{"notfound", func(string, map[string]any) (any, error) {
		return cleanResponse(404, map[string]any{"error": "no such record"}, nil), nil
	}},
	{"server", func(string, map[string]any) (any, error) {
		return cleanResponse(500, map[string]any{"error": "boom"}, nil), nil
	}},
	{"transport", func(url string, _ map[string]any) (any, error) {
		return nil, fmt.Errorf("socket hang up (URL was: %q)", url)
	}},
	// The SDK's own error, its code quoting a registered value.
	{"coded", func(string, map[string]any) (any, error) {
		return nil, core.New${Name}Error("denied_"+cleanCanary["apikey"], "coded failure", nil)
	}},
	{"notjson", func(string, map[string]any) (any, error) {
		return map[string]any{
			"status":     200,
			"statusText": "OK",
			"headers":    map[string]any{},
			"json":       (func() any)(func() any { return nil }),
			"body":       "<html>",
		}, nil
	}},
}

// Offline, as every generated suite is: the test OPTION resolves a required
// server variable to test-<name>, and installs no transport.
func cleanOffline(opts map[string]any) map[string]any {
	opts["test"] = map[string]any{"active": true}
	return opts
}

// A client the sweep cannot build leaves nothing swept: a harness error, not
// a leak, which cleanHarness reports instead of letting the panic end the run.
type cleanHarnessError struct{ cause any }

func cleanNew(opts map[string]any) *sdk.${Name}SDK {
	defer func() {
		if r := recover(); r != nil {
			panic(cleanHarnessError{r})
		}
	}()
	return sdk.New${Name}SDK(cleanOffline(opts))
}

func cleanHarness(t *testing.T) {
	if r := recover(); r != nil {
		if h, ok := r.(cleanHarnessError); ok {
			t.Fatalf("clean harness: the client could not be constructed, so nothing was swept: %v",
				h.cause)
		}
		panic(r)
	}
}

func cleanMakeSdk(scenario cleanScenario, sinks *[]cleanSink, cleanopts map[string]any,
	extra ...any) *sdk.${Name}SDK {
	return cleanNew(cleanOptions(scenario, sinks, cleanopts, extra...))
}

func cleanOptions(scenario cleanScenario, sinks *[]cleanSink, cleanopts map[string]any,
	extra ...any) map[string]any {
	capture := func(name string) func(map[string]any) {
		return func(rec map[string]any) {
			*sinks = append(*sinks, cleanSurfaces(name, rec)...)
		}
	}

	feature := map[string]any{}
	if fhHasFeature("log") {
		feature["log"] = map[string]any{
			"active": true,
			"logger": slog.New(&cleanLogHandler{name: "log", sinks: sinks}),
		}
	}
	if fhHasFeature("debug") {
		feature["debug"] = map[string]any{"active": true, "onEntry": capture("debug")}
	}
	if fhHasFeature("audit") {
		feature["audit"] = map[string]any{"active": true, "sink": capture("audit")}
	}
	if fhHasFeature("telemetry") {
		feature["telemetry"] = map[string]any{"active": true, "exporter": capture("telemetry")}
	}
	if fhHasFeature("cost") {
		feature["cost"] = map[string]any{"active": true, "sink": capture("cost")}
	}
	if fhHasFeature("metrics") {
		feature["metrics"] = map[string]any{"active": true}
	}
	if fhHasFeature("clienttrack") {
		feature["clienttrack"] = map[string]any{"active": true}
	}

	clean := map[string]any{"values": cleanCanary["value"]}
	for k, v := range cleanopts {
		clean[k] = v
	}

	return map[string]any{
		"apikey":  cleanCanary["apikey"],
		"secret":  cleanCanary["secret"],
		"headers": map[string]any{"X-Custom-Token": cleanCanary["header"]},
		"clean":   clean,
		"feature": feature,
		"extend":  append([]any{newCleanCapture(sinks)}, extra...),
		"utility": map[string]any{
			"fetcher": sdk.FetcherFunc(func(_ *sdk.Context, url string, fetchdef map[string]any) (any, error) {
				return scenario.respond(url, fetchdef)
			}),
		},
	}
}

// One operation this SDK can perform: the client method returning the
// entity, the op method on it, and the match it completes with.
type cleanOp struct {
	accessor string
	method   string
	match    map[string]any
}

func cleanEntity(client *sdk.${Name}SDK, accessor string) reflect.Value {
	return reflect.ValueOf(client).MethodByName(accessor).
		Call([]reflect.Value{reflect.ValueOf(map[string]any(nil))})[0]
}

func cleanInvoke(entity reflect.Value, op cleanOp, ctrl map[string]any) (any, error) {
	match := map[string]any{}
	for k, v := range op.match {
		match[k] = v
	}
	rets := entity.MethodByName(op.method).Call([]reflect.Value{
		reflect.ValueOf(match),
		reflect.ValueOf(ctrl),
	})
	var err error
	if e, ok := rets[1].Interface().(error); ok {
		err = e
	}
	return rets[0].Interface(), err
}

// Every path parameter an op's points declare, filled in.
func cleanFilled(client *sdk.${Name}SDK, entity string, method string) map[string]any {
	filled := map[string]any{}
	opdef := core.ToMapAny(core.ToMapAny(core.ToMapAny(core.ToMapAny(
		client.GetRootCtx().Config["entity"])[entity])["op"])[strings.ToLower(method)])
	points, _ := opdef["points"].([]any)
	for _, point := range points {
		params, _ := core.ToMapAny(core.ToMapAny(point)["args"])["params"].([]any)
		for _, p := range params {
			if name, ok := core.ToMapAny(p)["name"].(string); ok {
				filled[name] = "p1"
			}
		}
	}
	return filled
}

// The first operation that completes against a plain 200: with no
// arguments, else with every path parameter its points declare filled in.
// An entity accessor is a client method taking one options map and
// returning something that answers GetName().
func cleanUsableOp() (cleanOp, bool) {
	plain := func() *sdk.${Name}SDK {
		return cleanNew(map[string]any{
			"apikey": cleanCanary["apikey"],
			"utility": map[string]any{
				"fetcher": sdk.FetcherFunc(func(*sdk.Context, string, map[string]any) (any, error) {
					return cleanResponse(200, map[string]any{"id": "i1"}, nil), nil
				}),
			},
		})
	}

	probe := plain()
	cv := reflect.ValueOf(probe)
	ct := cv.Type()
	mapType := reflect.TypeOf(map[string]any{})

	accessors := []string{}
	for i := 0; i < ct.NumMethod(); i++ {
		m := ct.Method(i)
		if m.Type.NumIn() != 2 || m.Type.NumOut() != 1 || m.Type.In(1) != mapType {
			continue
		}
		ent := cleanEntity(probe, m.Name)
		if !ent.IsValid() || (ent.Kind() == reflect.Ptr && ent.IsNil()) {
			continue
		}
		gn := ent.MethodByName("GetName")
		if !gn.IsValid() || gn.Type().NumIn() != 0 || gn.Type().NumOut() != 1 ||
			gn.Type().Out(0).Kind() != reflect.String {
			continue
		}
		accessors = append(accessors, m.Name)
	}
	sort.Strings(accessors)

	for _, accessor := range accessors {
		for _, method := range []string{"List", "Load", "Create", "Update", "Patch", "Remove"} {
			om := cleanEntity(probe, accessor).MethodByName(method)
			if !om.IsValid() || om.Type().NumIn() != 2 || om.Type().NumOut() != 2 {
				continue
			}
			name := cleanEntity(probe, accessor).MethodByName("GetName").
				Call(nil)[0].String()
			for _, match := range []map[string]any{{}, cleanFilled(probe, name, method)} {
				op := cleanOp{accessor: accessor, method: method, match: match}
				if _, err := cleanInvoke(cleanEntity(plain(), accessor), op, map[string]any{}); err == nil {
					return op, true
				}
			}
		}
	}
	return cleanOp{}, false
}

func cleanDrive(client *sdk.${Name}SDK, op cleanOp, ctrl map[string]any, sinks *[]cleanSink) error {
	// A caller may keep the record it passed rather than read ctrl["explain"].
	held, _ := ctrl["explain"].(map[string]any)
	entity := cleanEntity(client, op.accessor)
	out, err := cleanInvoke(entity, op, ctrl)
	if err != nil {
		*sinks = append(*sinks, cleanSurfaces("error", err)...)
	}
	if out != nil {
		*sinks = append(*sinks, cleanSurfaces("result", out)...)
	}
	// Raw, as a caller copying the match into another query reads it.
	*sinks = append(*sinks, cleanSurfaces("match",
		entity.MethodByName("Match").Call(nil)[0].Interface())...)
	explain, ok := ctrl["explain"].(map[string]any)
	if ok {
		*sinks = append(*sinks, cleanSurfaces("explain", explain)...)
	}
	if held != nil && reflect.ValueOf(held).Pointer() != reflect.ValueOf(explain).Pointer() {
		*sinks = append(*sinks, cleanSurfaces("explain:held", held)...)
	}
	return err
}

// A feature that fails from inside the pipeline, quoting the request it
// saw: a panic MakeError never handled. Its PreUnexpected variant panics
// inside MakeError, after the cleaning there.
type cleanThrow struct {
	sdk.BaseFeature
	response   bool
	unexpected bool
}

func newCleanThrow(response bool, unexpected bool) *cleanThrow {
	return &cleanThrow{
		BaseFeature: sdk.BaseFeature{Version: "0.0.1", Name: "throwhook", Active: true},
		response:    response,
		unexpected:  unexpected,
	}
}

func (f *cleanThrow) PreResponse(ctx *sdk.Context) {
	if f.response {
		raw, _ := json.Marshal(ctx.Spec)
		panic(fmt.Errorf("hook saw %s", raw))
	}
}

func (f *cleanThrow) PreUnexpected(ctx *sdk.Context) {
	if f.unexpected {
		raw, _ := json.Marshal(ctx.Spec)
		panic(fmt.Errorf("hook saw %s", raw))
	}
}

// A stream that succeeds, so Stream never reaches Done.
type cleanStreamOk struct {
	sdk.BaseFeature
}

func (f *cleanStreamOk) PreDone(ctx *sdk.Context) {
	var items []any
	switch d := ctx.Result.Resdata.(type) {
	case []any:
		items = d
	case nil:
	default:
		items = []any{d}
	}
	ctx.Result.Stream = func() <-chan any {
		ch := make(chan any, len(items))
		for _, item := range items {
			ch <- item
		}
		close(ch)
		return ch
	}
}

// A stream function that panics when Stream calls it, quoting a credential.
type cleanStreamPanic struct {
	sdk.BaseFeature
}

func (f *cleanStreamPanic) PreDone(ctx *sdk.Context) {
	ctx.Result.Stream = func() <-chan any {
		panic("stream saw " + cleanCanary["apikey"])
	}
}

// A panic that escapes is a surface too: what a crash would print.
func cleanCatch(name string, sinks *[]cleanSink, fn func() error) (err error) {
	defer func() {
		if r := recover(); r != nil {
			if _, harness := r.(cleanHarnessError); harness {
				panic(r)
			}
			*sinks = append(*sinks, cleanSurfaces(name+":panic", r)...)
			err = fmt.Errorf("panic: %v", r)
		}
	}()
	return fn()
}

const cleanNoOp = "no operation of this SDK completes against a plain 200; nothing to sweep"

func TestCleanSweep(t *testing.T) {
	defer cleanHarness(t)
	op, found := cleanUsableOp()
	if !found {
		t.Skip(cleanNoOp)
	}

	sinks := []cleanSink{}
	errs := map[string]error{}
	explains := map[string]map[string]any{}

	variants := []struct {
		name string
		ctrl func() map[string]any
	}{
		{"throw", func() map[string]any { return map[string]any{} }},
		{"explain", func() map[string]any { return map[string]any{"explain": map[string]any{}} }},
		{"nothrow", func() map[string]any {
			return map[string]any{"throw": false, "explain": map[string]any{}}
		}},
	}

	for _, scenario := range cleanScenarios {
		for _, variant := range variants {
			client := cleanMakeSdk(scenario, &sinks, nil)
			ctrl := variant.ctrl()
			err := cleanDrive(client, op, ctrl, &sinks)
			key := scenario.name + "/" + variant.name
			if err != nil {
				errs[key] = err
			}
			if explain, ok := ctrl["explain"].(map[string]any); ok {
				explains[key] = explain
			}
			sinks = append(sinks, cleanSurfaces("sdk", client)...)
			sinks = append(sinks, cleanSink{"sdk:value", fmt.Sprintf("%+v", *client)})
		}
	}

	// A name given at run time replaces the declared one: the match leaves
	// out whichever name PrepareAuth placed.
	renamed := cleanOptions(cleanScenarios[0], &sinks, nil)
	renamed["auth"] = map[string]any{"name": "zzcred"}
	cleanDrive(cleanNew(renamed), op, map[string]any{}, &sinks)

	// A credential mistyped as a map. The go validator substitutes the
	// default rather than rejecting it, so there is no rejection to sweep:
	// sweep what the constructor produced, and what clean makes of the value
	// should anything later quote it.
	cleanCatch("mistyped", &sinks, func() error {
		client := sdk.New${Name}SDK(cleanOffline(map[string]any{
			"apikey": map[string]any{"value": cleanCanary["apikey"]},
			"clean":  map[string]any{"values": cleanCanary["value"]},
		}))
		sinks = append(sinks, cleanSurfaces("mistyped", client)...)
		sinks = append(sinks, cleanSurfaces("mistyped:quoted",
			client.GetUtility().Clean(client.GetRootCtx(), "found map: "+cleanCanary["apikey"]))...)
		return nil
	})

	// MakeError is the one place PreUnexpected fires, so the variant that
	// panics there alone is driven through a 404 as well.
	for _, hooked := range []struct {
		scenario cleanScenario
		hook     *cleanThrow
	}{
		{cleanScenarios[0], newCleanThrow(true, false)},
		{cleanScenarios[0], newCleanThrow(true, true)},
		{cleanScenarios[1], newCleanThrow(false, true)},
	} {
		hookerr := cleanCatch("hook", &sinks, func() error {
			return cleanDrive(cleanMakeSdk(hooked.scenario, &sinks, nil, hooked.hook), op,
				map[string]any{"explain": map[string]any{}}, &sinks)
		})
		if hookerr == nil {
			t.Errorf("the throwing hook should fail the operation")
		}
	}

	// A panic inside a stream must end it through MakeError, its cleaned
	// error the last value sent, and not crash the process. However it ends,
	// the explain record the caller passed is left clean.
	for _, streamed := range []struct {
		name  string
		saw   string
		extra []any
	}{
		{"stream-hook", "hook saw", []any{newCleanThrow(true, false)}},
		{"stream", "stream saw", []any{&cleanStreamPanic{
			BaseFeature: sdk.BaseFeature{Version: "0.0.1", Name: "streampanic", Active: true}}}},
		{"stream-ok", "", []any{&cleanStreamOk{
			BaseFeature: sdk.BaseFeature{Version: "0.0.1", Name: "streamok", Active: true}}}},
		{"stream-plain", "", nil},
	} {
		client := cleanMakeSdk(cleanScenarios[0], &sinks, nil, streamed.extra...)
		reqmatch := map[string]any{}
		for k, v := range op.match {
			reqmatch[k] = v
		}
		explain := map[string]any{}
		items := cleanEntity(client, op.accessor).MethodByName("Stream").Call([]reflect.Value{
			reflect.ValueOf(strings.ToLower(op.method)),
			reflect.ValueOf(map[string]any{"reqmatch": reqmatch}),
			reflect.ValueOf(map[string]any{"ctrl": map[string]any{"explain": explain}}),
		})[0].Interface().(<-chan core.StreamItem)
		var streamerr error
		for item := range items {
			if item.Err != nil {
				streamerr = item.Err
				sinks = append(sinks, cleanSurfaces(streamed.name, item.Err)...)
			}
		}
		sinks = append(sinks, cleanSurfaces(streamed.name+":explain", explain)...)
		if 0 == len(explain) {
			t.Errorf("%s: the explain record was not filled", streamed.name)
		}
		msg, _ := core.ToMapAny(explain["err"])["message"].(string)
		if ("" == streamed.saw) != (nil == explain["err"]) || !strings.Contains(msg, streamed.saw) {
			t.Errorf("%s: only a failing stream ends as the SDK error, got %v", streamed.name, explain)
		}
		if ("" == streamed.saw) != (nil == streamerr) {
			t.Errorf("%s: only a failing stream sends an error, got %v", streamed.name, streamerr)
		}
	}

	// A registered value used as a property name is masked; names that mask
	// alike are kept apart.
	probe := cleanMakeSdk(cleanScenarios[0], &sinks, nil)
	named, _ := probe.GetUtility().Clean(probe.GetRootCtx(), map[string]any{
		cleanCanary["value"]: 1, cleanCanary["header"]: 2, "plain": 3,
	}).(map[string]any)
	sinks = append(sinks, cleanSurfaces("named", named)...)
	if want := map[string]any{cleanMask: 2, cleanMask + "#1": 1, "plain": 3}; !reflect.DeepEqual(named, want) {
		t.Errorf("property names: expected %v, got %v", want, named)
	}

	// The generated config's own clean block is read beside the caller's,
	// and is not changed by it.
	cfgclean := map[string]any{"keys": "zzsens", "values": cleanCanary["config"]}
	util := probe.GetUtility()
	cfgctx := &core.Context{Options: util.MakeOptions(&core.Context{
		Utility: util,
		Config:  map[string]any{"options": map[string]any{"clean": cfgclean}},
		Options: map[string]any{"clean": map[string]any{"values": cleanCanary["value"]}},
	})}
	seeded, _ := util.Clean(cfgctx, "config "+cleanCanary["config"]+" caller "+cleanCanary["value"]).(string)
	sinks = append(sinks, cleanSink{"config-clean", seeded})
	if want := "config " + cleanMask + " caller " + cleanMask; seeded != want {
		t.Errorf("config clean values: expected %q, got %q", want, seeded)
	}
	bykey, _ := util.Clean(cfgctx, map[string]any{"my_zzsens": "x", "other": "y"}).(map[string]any)
	if want := map[string]any{"my_zzsens": cleanMask, "other": "y"}; !reflect.DeepEqual(bykey, want) {
		t.Errorf("config clean keys: expected %v, got %v", want, bykey)
	}
	if cfgclean["keys"] != "zzsens" || cfgclean["values"] != cleanCanary["config"] {
		t.Errorf("the config's own clean block was changed: %v", cfgclean)
	}

	// With no clean option at all, the schema defaults still apply.
	bare := cleanNew(map[string]any{
		"apikey":  cleanCanary["apikey"],
		"secret":  cleanCanary["secret"],
		"headers": map[string]any{"X-Custom-Token": cleanCanary["header"]},
		"utility": map[string]any{
			"fetcher": sdk.FetcherFunc(func(_ *sdk.Context, url string, fetchdef map[string]any) (any, error) {
				return cleanScenarios[1].respond(url, fetchdef)
			}),
		},
	})
	if nil == cleanDrive(bare, op, map[string]any{"explain": map[string]any{}}, &sinks) {
		t.Errorf("the 404 scenario should fail without a clean option too")
	}

	// A feature's name is not a field name: only the sensitive names inside
	// its settings register. An entity block, of per-entity settings or seeded
	// records keyed by entity name and id, is not read at all, and nor are
	// rbac's rules, keyed by entity and operation names.
	featured := cleanNew(map[string]any{
		"apikey": cleanCanary["apikey"],
		"feature": map[string]any{
			"zzsecrets": map[string]any{"active": false, "kind": "PLAINSETTING-q8w2e4r6"},
			"zzfeat":    map[string]any{"active": false, "apitoken": "FEATTOKEN-z9y8x7w6"},
			"rbac":      map[string]any{"active": false, "rules": map[string]any{"zztoken.load": "PLAINRULE-k7j5h3g1"}},
			"test": map[string]any{"active": false, "entity": map[string]any{
				"zztoken": map[string]any{"ZZTOKEN01": map[string]any{"note": "PLAINRECORD-t5r3e1w9"}},
			}},
		},
		"entity": map[string]any{"zztoken": map[string]any{"alias": map[string]any{"zzkey": "PLAINALIAS-m2n4b6v8"}}},
	})
	fclean := featured.GetUtility().Clean
	if got, _ := fclean(featured.GetRootCtx(), "kind PLAINSETTING-q8w2e4r6").(string); got != "kind PLAINSETTING-q8w2e4r6" {
		t.Errorf("a setting of a feature named like a secret was registered: %q", got)
	}
	if got, _ := fclean(featured.GetRootCtx(), "token FEATTOKEN-z9y8x7w6").(string); got != "token "+cleanMask {
		t.Errorf("a sensitive setting inside a feature was not registered: %q", got)
	}
	for _, plain := range []string{"record PLAINRECORD-t5r3e1w9", "alias PLAINALIAS-m2n4b6v8"} {
		if got, _ := fclean(featured.GetRootCtx(), plain).(string); got != plain {
			t.Errorf("an entity block was registered: %q", got)
		}
	}
	if got, _ := fclean(featured.GetRootCtx(), "rule PLAINRULE-k7j5h3g1").(string); got != "rule PLAINRULE-k7j5h3g1" {
		t.Errorf("an rbac rule keyed by entity and operation was registered: %q", got)
	}

	leaked := []string{}
	for _, s := range sinks {
		if found := cleanLeaks(s.text); 0 < len(found) {
			leaked = append(leaked, s.name+" ["+strings.Join(found, ", ")+"]")
		}
	}

	fmt.Printf("clean: swept %d surface(s), %d leak(s)\\n", len(sinks), len(leaked))

	if 0 < len(leaked) {
		t.Fatalf("credential leaked through: %s", strings.Join(leaked, "; "))
	}

	// The positive half: the slot the credential travelled in is masked,
	// and an unregistered token in a response header is masked by name.
	notfound, _ := errs["notfound/throw"].(*sdk.${Name}Error)
	if notfound == nil {
		t.Fatalf("the 404 scenario must return the SDK error, got %v", errs["notfound/throw"])
	}
	result, _ := notfound.Result.(map[string]any)
	if core.ToInt(result["status"]) != 404 {
		t.Fatalf("expected status 404 on the error, got %v", result["status"])
	}
	spec, _ := notfound.Spec.(map[string]any)
	if !cleanAuth.suppressed {
		switch cleanAuth.where {
		case "query":
			if got := cleanHeader(spec["query"], cleanAuth.name); got != cleanMask {
				t.Errorf("%s: expected the mask, got %v", cleanAuth.name, got)
			}
		case "cookie":
			got := fmt.Sprintf("%v", cleanHeader(spec["headers"], "cookie"))
			if !strings.Contains(got, cleanMask) {
				t.Errorf("cookie: expected the mask, got %v", got)
			}
		default:
			got := fmt.Sprintf("%v", cleanHeader(spec["headers"], cleanAuth.name))
			if !strings.HasSuffix(got, cleanMask) {
				t.Errorf("%s: expected the mask, got %v", cleanAuth.name, got)
			}
		}
	}
	if got := cleanHeader(spec["headers"], "x-custom-token"); got != cleanMask {
		t.Errorf("x-custom-token: expected the mask, got %v", got)
	}

	coded, _ := errs["coded/throw"].(*sdk.${Name}Error)
	if coded == nil || coded.Code != "denied_"+cleanMask {
		t.Errorf("the coded error keeps its code, masked: got %#v", errs["coded/throw"])
	}

	explained := explains["ok/explain"]
	explainedResult, _ := explained["result"].(map[string]any)
	if explainedResult == nil {
		t.Fatalf("the explain record should carry the result, got %v", explained)
	}
	if got := cleanHeader(explainedResult["headers"], "x-session-token"); got != cleanMask {
		t.Errorf("x-session-token: expected the mask, got %v", got)
	}
}

func TestCleanSensitivity(t *testing.T) {
	defer cleanHarness(t)
	op, found := cleanUsableOp()
	if !found {
		t.Skip(cleanNoOp)
	}

	sinks := []cleanSink{}
	client := cleanMakeSdk(cleanScenarios[1], &sinks, map[string]any{"active": false})
	err := cleanDrive(client, op, map[string]any{}, &sinks)
	if err == nil {
		t.Fatal("the 404 scenario must fail")
	}

	// Explaining a failure must not cost it its error, nor the record.
	discard := []cleanSink{}
	ectrl := map[string]any{"explain": map[string]any{}}
	explained := cleanDrive(cleanMakeSdk(cleanScenarios[1], &discard, map[string]any{"active": false}),
		op, ectrl, &discard)
	if explained == nil || explained.Error() != err.Error() {
		t.Errorf("with clean off, explain lost the error: %v", explained)
	}
	if nil == ectrl["explain"].(map[string]any)["err"] {
		t.Errorf("with clean off, the explain record was emptied: %v", ectrl["explain"])
	}

	leaked := 0
	for _, s := range sinks {
		if 0 < len(cleanLeaks(s.text)) {
			leaked++
		}
	}
	if leaked == 0 {
		t.Fatal("with clean off, nothing showed the canary: the sweep is blind")
	}

	if !cleanAuth.suppressed {
		sdkerr, _ := err.(*sdk.${Name}Error)
		if sdkerr == nil {
			t.Fatalf("expected the SDK error, got %v", err)
		}
		raw, _ := json.Marshal(sdkerr.Spec)
		text := string(raw)
		composite := base64.StdEncoding.EncodeToString(
			[]byte(cleanCanary["apikey"] + ":" + cleanCanary["secret"]))
		if !strings.Contains(text, cleanCanary["apikey"]) && !strings.Contains(text, composite) {
			t.Errorf("the raw spec should carry the credential when clean is off, got %s", text)
		}
	}
}
`
}


export {
  TestClean
}
