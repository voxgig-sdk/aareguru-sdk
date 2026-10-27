package feature

import (
	"fmt"
	"time"

	"github.com/voxgig-sdk/aareguru-sdk/go/core"
)

// Per-request timeout. Wraps the active transport and races each attempt
// against a deadline; if the deadline wins, the request resolves to a
// `timeout` error instead of hanging. The inner transport is left to finish
// in its own goroutine (its result is discarded), matching how the ts
// feature lets the losing racer resolve unobserved.
type TimeoutFeature struct {
	BaseFeature
	client  *core.AareguruSDK
	options map[string]any

	// Activity tracking (mirrors the ts client._timeout record).
	Count int
	Ms    int
}

func NewTimeoutFeature() *TimeoutFeature {
	return &TimeoutFeature{
		BaseFeature: BaseFeature{
			Version: "0.0.1",
			Name:    "timeout",
			Active:  true,
		},
	}
}

func (f *TimeoutFeature) Init(ctx *core.Context, options map[string]any) {
	f.client = ctx.Client
	f.options = options
	f.Active = foptBool(options, "active", false)

	if !f.Active {
		return
	}

	inner := ctx.Utility.Fetcher

	ctx.Utility.Fetcher = func(ctx2 *core.Context, url string, fetchdef map[string]any) (any, error) {
		return f.withTimeout(ctx2, url, fetchdef, inner)
	}
}

func (f *TimeoutFeature) withTimeout(ctx *core.Context, url string, fetchdef map[string]any,
	inner core.FetcherFunc) (any, error) {

	ms := foptInt(f.options, "ms", 30000)
	if ms <= 0 {
		return inner(ctx, url, fetchdef)
	}

	// The deadline runs from here, not from the wait. Deadline and response land
	// in one channel, first in first out: a response that arrived in time is
	// taken however late the caller is scheduled, a late one is a timeout.
	type landed struct {
		res      any
		err      error
		at       int64
		deadline bool
	}
	now := foptNow(f.options)
	start := now()
	out := make(chan landed, 2)
	remaining := int64(ms) - (now() - start)
	if remaining < 0 {
		remaining = 0
	}
	timer := time.AfterFunc(time.Duration(remaining)*time.Millisecond, func() {
		out <- landed{deadline: true}
	})
	defer timer.Stop()
	go func() {
		res, err := inner(ctx, url, fetchdef)
		out <- landed{res: res, err: err, at: now()}
	}()

	got := <-out
	if got.deadline {
		select {
		case got = <-out:
		default:
		}
	}
	if got.deadline || int64(ms) < got.at-start {
		return nil, f.timeout(ctx, ms)
	}
	return got.res, got.err
}

func (f *TimeoutFeature) timeout(ctx *core.Context, ms int) error {
	f.track(ms)
	return ctx.MakeError("timeout", fmt.Sprintf("Request exceeded timeout of %dms", ms))
}

func (f *TimeoutFeature) track(ms int) {
	f.Count++
	f.Ms = ms
}
