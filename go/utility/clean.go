package utility

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math"
	"reflect"
	"sort"
	"strconv"
	"strings"
	"sync"

	vs "github.com/voxgig-sdk/aareguru-sdk/go/utility/struct"

	"github.com/voxgig-sdk/aareguru-sdk/go/core"
)

// Everything that leaves the pipeline passes through clean: the error, the
// explain record, the serialised context, and whatever a feature emits. A
// registered secret VALUE (and its encoded forms) is replaced wherever it
// appears in a string; a value under a sensitive KEY name is masked whatever
// it holds. Inside the pipeline data stays raw for the hooks that add to it.

const cleanMaxDepth = 32
const cleanCircular = "[circular]"

// The derived clean block makeOptions builds, shared by every context of a
// client. Unlike the ts reference it is appended to from any goroutine
// (prepareAuth registers per request), so the registry is locked.
type cleanConfig struct {
	active bool
	keys   []string
	mask   string
	hint   int
	min    int

	mu     sync.RWMutex
	values []string
}

// What a snapshot has no data form for (a function, a channel).
type cleanDrop struct{}

// A plain error whose message was cleaned; the cause stays reachable by
// Unwrap, the way ctx does on the SDK error, and never by a printer.
type cleanedError struct {
	msg   string
	cause error
}

func (e *cleanedError) Error() string { return e.msg }
func (e *cleanedError) Unwrap() error { return e.cause }

func cleanNormKey(key string) string {
	return strings.NewReplacer("-", "", "_", "").Replace(strings.ToLower(key))
}

func cleanSplit(raw any) []string {
	out := []string{}
	switch v := raw.(type) {
	case []string:
		return append(out, v...)
	case []any:
		for _, item := range v {
			if s, ok := item.(string); ok {
				out = append(out, s)
			}
		}
		return out
	case string:
		for _, part := range strings.Split(v, ",") {
			if part = strings.TrimSpace(part); part != "" {
				out = append(out, part)
			}
		}
	}
	return out
}

func cleanSplitKeys(raw any) []string {
	out := []string{}
	for _, k := range cleanSplit(raw) {
		if nk := cleanNormKey(k); nk != "" {
			out = append(out, nk)
		}
	}
	return out
}

// The spec carries numbers as strings, so every target reads it alike.
func cleanCount(val any, dflt int) int {
	var n float64
	switch v := val.(type) {
	case string:
		f, err := strconv.ParseFloat(strings.TrimSpace(v), 64)
		if err != nil {
			return dflt
		}
		n = f
	case json.Number:
		f, err := v.Float64()
		if err != nil {
			return dflt
		}
		n = f
	default:
		rv := reflect.ValueOf(val)
		switch rv.Kind() {
		case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
			n = float64(rv.Int())
		case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
			n = float64(rv.Uint())
		case reflect.Float32, reflect.Float64:
			n = rv.Float()
		default:
			return dflt
		}
	}
	n = math.Floor(n)
	if math.IsNaN(n) || math.IsInf(n, 0) || n < 0 {
		return dflt
	}
	return int(n)
}

func makeCleanConfig(cleanopts map[string]any) *cleanConfig {
	cfg := &cleanConfig{
		active: true,
		keys:   cleanSplitKeys(cleanopts["keys"]),
		values: []string{},
		mask:   "[redacted]",
		hint:   cleanCount(cleanopts["hint"], 0),
		min:    cleanCount(cleanopts["min"], 4),
	}
	if active, ok := cleanopts["active"].(bool); ok && !active {
		cfg.active = false
	}
	if mask, ok := cleanopts["mask"].(string); ok {
		cfg.mask = mask
	}
	if cfg.min < 1 {
		cfg.min = 1
	}
	return cfg
}

// The derived block makeOptions builds; a context without options (makeError
// is reached with a bare one) falls back to the schema defaults, so nothing
// leaves raw for want of a constructor.
func cleanConfigOf(ctx *core.Context) *cleanConfig {
	if ctx != nil && ctx.Options != nil {
		if derived, ok := ctx.Options["__derived__"].(map[string]any); ok {
			if cfg, ok := derived["clean"].(*cleanConfig); ok {
				return cfg
			}
		}
	}
	spec, _ := core.OPTSPEC["clean"].(map[string]any)
	return makeCleanConfig(spec)
}

// encodeURIComponent, byte for byte: the query form of a credential.
func cleanPercent(s string) string {
	const keep = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.!~*'()"
	var b strings.Builder
	for i := 0; i < len(s); i++ {
		c := s[i]
		if strings.IndexByte(keep, c) >= 0 {
			b.WriteByte(c)
		} else {
			b.WriteString(fmt.Sprintf("%%%02X", c))
		}
	}
	return b.String()
}

func cleanJSONEscape(s string) string {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(s); err != nil {
		return ""
	}
	out := strings.TrimSpace(buf.String())
	if len(out) < 2 {
		return ""
	}
	return out[1 : len(out)-1]
}

// The encoded forms a value travels in: Basic and Bearer both carry base64,
// a query credential is percent-encoded, and a JSON dump escapes it.
func cleanForms(value string) []string {
	out := []string{value}
	add := func(s string) {
		if s != "" && !cleanHas(out, s) {
			out = append(out, s)
		}
	}
	add(base64.StdEncoding.EncodeToString([]byte(value)))
	add(cleanPercent(value))
	add(cleanJSONEscape(value))
	return out
}

func cleanHas(list []string, s string) bool {
	for _, item := range list {
		if item == s {
			return true
		}
	}
	return false
}

// Register a secret value. Idempotent; shorter than `min` is not a secret
// the SDK can mask without blanking ordinary text.
func (cfg *cleanConfig) add(value string) {
	if len(value) < cfg.min {
		return
	}
	cfg.mu.Lock()
	defer cfg.mu.Unlock()
	changed := false
	for _, form := range cleanForms(value) {
		if len(form) >= cfg.min && !cleanHas(cfg.values, form) {
			cfg.values = append(cfg.values, form)
			changed = true
		}
	}
	if changed {
		sort.SliceStable(cfg.values, func(i, j int) bool {
			return len(cfg.values[i]) > len(cfg.values[j])
		})
	}
}

func cleanAddUtil(ctx *core.Context, val any) {
	if s, ok := val.(string); ok {
		cleanConfigOf(ctx).add(s)
	}
}

// A number registers as its decimal text, the form a message quotes it in.
func cleanScalarText(val any) (string, bool) {
	switch v := val.(type) {
	case string:
		return v, true
	case json.Number:
		return v.String(), true
	case bool:
		return "", false
	}
	rv := reflect.ValueOf(val)
	switch rv.Kind() {
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return strconv.FormatInt(rv.Int(), 10), true
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return strconv.FormatUint(rv.Uint(), 10), true
	case reflect.Float32, reflect.Float64:
		return strconv.FormatFloat(rv.Float(), 'f', -1, 64), true
	}
	return "", false
}

// Every scalar under a sensitive name, at any depth and of any shape: a
// credential mistyped as a map or a number is still a credential, and the
// validation that rejects it can quote it.
func (cfg *cleanConfig) addSensitive(val any, under bool, depth int, seen []uintptr) {
	if val == nil || cleanMaxDepth <= depth {
		return
	}
	if s, ok := cleanScalarText(val); ok {
		if under {
			cfg.add(s)
		}
		return
	}
	rv := reflect.ValueOf(val)
	switch rv.Kind() {
	case reflect.Map, reflect.Slice:
		if rv.IsNil() {
			return
		}
		id := rv.Pointer()
		for _, s := range seen {
			if s == id {
				return
			}
		}
		seen = append(seen, id)
	case reflect.Array:
	default:
		return
	}
	if rv.Kind() == reflect.Map {
		iter := rv.MapRange()
		for iter.Next() {
			k := fmt.Sprint(iter.Key().Interface())
			cfg.addSensitive(iter.Value().Interface(), under || cfg.sensitive(k), depth+1, seen)
		}
		return
	}
	for i := 0; i < rv.Len(); i++ {
		cfg.addSensitive(rv.Index(i).Interface(), under, depth+1, seen)
	}
}

func cleanAddSensitive(ctx *core.Context, val any) {
	cleanConfigOf(ctx).addSensitive(val, false, 0, nil)
}

// One pass over one value: the registry as it stood when the pass began,
// and the ancestors of the node in hand, for cutting cycles.
type cleaner struct {
	cfg    *cleanConfig
	values []string
	seen   []uintptr
}

func newCleaner(cfg *cleanConfig) *cleaner {
	cfg.mu.RLock()
	values := append([]string(nil), cfg.values...)
	cfg.mu.RUnlock()
	return &cleaner{cfg: cfg, values: values}
}

func (c *cleaner) maskValue(value string) string {
	if 0 < c.cfg.hint {
		runes := []rune(value)
		if len(runes) > 2*c.cfg.hint {
			return c.cfg.mask + string(runes[len(runes)-c.cfg.hint:])
		}
	}
	return c.cfg.mask
}

func (c *cleaner) cleanString(text string) string {
	out := text
	for _, value := range c.values {
		if strings.Contains(out, value) {
			out = strings.ReplaceAll(out, value, c.maskValue(value))
		}
	}
	return out
}

func (cfg *cleanConfig) sensitive(key string) bool {
	nk := cleanNormKey(key)
	for _, k := range cfg.keys {
		if strings.Contains(nk, k) {
			return true
		}
	}
	return false
}

func (c *cleaner) sensitiveKey(key string) bool {
	return c.cfg.sensitive(key)
}

// A plain-data copy of what is about to leave: the SDK's own types become
// their records, a json.Marshaler is honoured (the go spelling of toJSON),
// functions and channels are dropped, cycles are cut, and no live object is
// shared with the copy - masking the copy must never mask the pipeline's own
// spec.
func (c *cleaner) snapshot(val any, key string, haskey bool, depth int) any {
	if val == nil {
		return nil
	}

	sensitive := haskey && c.sensitiveKey(key)

	switch v := val.(type) {
	case string:
		if sensitive {
			return c.maskValue(v)
		}
		return c.cleanString(v)
	case bool, int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64,
		float32, float64, json.Number:
		if sensitive {
			return c.cfg.mask
		}
		return v
	}

	if sensitive {
		return c.cfg.mask
	}

	if cleanMaxDepth <= depth {
		return cleanCircular
	}

	rv := reflect.ValueOf(val)
	switch rv.Kind() {
	case reflect.Map, reflect.Ptr, reflect.Slice:
		if rv.IsNil() {
			return nil
		}
		id := rv.Pointer()
		for _, seen := range c.seen {
			if seen == id {
				return cleanCircular
			}
		}
		c.seen = append(c.seen, id)
		defer func() { c.seen = c.seen[:len(c.seen)-1] }()
	case reflect.Func, reflect.Chan, reflect.UnsafePointer:
		return cleanDrop{}
	}

	switch v := val.(type) {
	case map[string]any:
		return c.plain(v, depth)
	case []any:
		return c.list(v, depth)
	case *vs.ListRef[any]:
		return c.list(v.List, depth)
	case *core.Context:
		return c.plain(v.Record(), depth)
	case *core.AareguruError:
		return c.plain(v.Record(), depth)
	case error:
		return map[string]any{"message": c.cleanString(v.Error())}
	case *core.Spec:
		return c.plain(cleanSpecRecord(v), depth)
	case *core.Result:
		return c.plain(cleanResultRecord(v), depth)
	case *core.Response:
		return c.plain(map[string]any{
			"status": v.Status, "statusText": v.StatusText, "headers": v.Headers,
			"body": v.Body, "err": v.Err,
		}, depth)
	case *core.Operation:
		return c.plain(map[string]any{
			"entity": v.Entity, "name": v.Name, "input": v.Input,
			"points": v.Points, "alias": v.Alias,
		}, depth)
	case *core.Control:
		return c.plain(map[string]any{
			"throw": v.Throw, "err": v.Err, "explain": v.Explain,
			"actor": v.Actor, "paging": v.Paging,
		}, depth)
	case core.Entity:
		// Data() fires the GetData hook, and a hook that logs would come
		// straight back here; the name is all an entity says of itself.
		return map[string]any{"name": v.GetName()}
	case json.Marshaler:
		return c.roundtrip(val, key, haskey, depth)
	}

	switch rv.Kind() {
	case reflect.Ptr:
		return c.snapshot(rv.Elem().Interface(), key, haskey, depth+1)
	case reflect.Map:
		byname := map[string]any{}
		iter := rv.MapRange()
		for iter.Next() {
			byname[fmt.Sprint(iter.Key().Interface())] = iter.Value().Interface()
		}
		return c.plain(byname, depth)
	case reflect.Slice, reflect.Array:
		out := make([]any, 0, rv.Len())
		for i := 0; i < rv.Len(); i++ {
			out = append(out, c.item(rv.Index(i).Interface(), depth))
		}
		return out
	case reflect.Struct:
		return c.roundtrip(val, key, haskey, depth)
	}

	return val
}

// A struct leaves as encoding/json would write it, then reads back as plain
// data for the walk; one that cannot be encoded leaves as its printed form,
// value-redacted.
func (c *cleaner) roundtrip(val any, key string, haskey bool, depth int) any {
	raw, err := json.Marshal(val)
	if err != nil {
		return c.cleanString(fmt.Sprintf("%v", val))
	}
	var plain any
	if err := json.Unmarshal(raw, &plain); err != nil {
		return c.cleanString(string(raw))
	}
	return c.snapshot(plain, key, haskey, depth+1)
}

// Keys in sorted order, so the counter a masked name takes does not depend
// on map iteration.
func (c *cleaner) plain(m map[string]any, depth int) map[string]any {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	out := make(map[string]any, len(m))
	for _, k := range keys {
		if s := c.snapshot(m[k], k, true, depth+1); (cleanDrop{}) != s {
			out[c.cleanName(out, k)] = s
		}
	}
	return out
}

// A registered value used as a property name is masked like any other
// string; names that mask alike take a counter, so none is lost.
func (c *cleaner) cleanName(out map[string]any, key string) string {
	name := c.cleanString(key)
	if _, taken := out[name]; name == key || !taken {
		return name
	}
	i := 1
	for {
		cand := name + "#" + strconv.Itoa(i)
		if _, taken := out[cand]; !taken {
			return cand
		}
		i++
	}
}

func (c *cleaner) list(l []any, depth int) []any {
	out := make([]any, 0, len(l))
	for _, v := range l {
		out = append(out, c.item(v, depth))
	}
	return out
}

func (c *cleaner) item(v any, depth int) any {
	s := c.snapshot(v, "", false, depth+1)
	if (cleanDrop{}) == s {
		return nil
	}
	return s
}

func cleanSpecRecord(s *core.Spec) map[string]any {
	return map[string]any{
		"parts": s.Parts, "headers": s.Headers, "alias": s.Alias,
		"base": s.Base, "prefix": s.Prefix, "suffix": s.Suffix,
		"params": s.Params, "query": s.Query, "step": s.Step,
		"method": s.Method, "body": s.Body, "url": s.Url, "path": s.Path,
	}
}

func cleanResultRecord(r *core.Result) map[string]any {
	return map[string]any{
		"ok": r.Ok, "status": r.Status, "statusText": r.StatusText,
		"headers": r.Headers, "body": r.Body, "err": r.Err,
		"resdata": r.Resdata, "resmatch": r.Resmatch,
		"paging": r.Paging, "streaming": r.Streaming,
	}
}

// Clean a value on its way out. A string is redacted; the SDK error is
// redacted IN PLACE (it is about to be returned, and its identity matters to
// the caller); anything else comes back as a masked plain-data copy.
func cleanUtil(ctx *core.Context, val any) any {
	cfg := cleanConfigOf(ctx)

	if !cfg.active {
		return val
	}

	c := newCleaner(cfg)

	switch v := val.(type) {
	case string:
		return c.cleanString(v)
	case *core.AareguruError:
		if v == nil {
			return v
		}
		v.Msg = c.cleanString(v.Msg)
		v.Code = c.cleanString(v.Code)
		v.Result = c.item(v.Result, 0)
		v.Spec = c.item(v.Spec, 0)
		return v
	case error:
		return &cleanedError{msg: c.cleanString(v.Error()), cause: v}
	}

	return c.item(val, -1)
}
