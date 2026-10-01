package feature

import (
	"GOMODULE/core"
)

type BaseFeature struct {
	Version string
	Name    string
	Active  bool

	// AddOpts positions this feature when added via the client `extend`
	// option: "__before__", "__after__" or "__replace__" name an
	// already-added feature (mirrors the ts feature `_options`).
	AddOpts map[string]any
}

// AddOptions is read by the featureAdd utility to place this feature.
func (f *BaseFeature) AddOptions() map[string]any { return f.AddOpts }

func NewBaseFeature() *BaseFeature {
	return &BaseFeature{
		Version: "0.0.1",
		Name:    "base",
		Active:  true,
	}
}

// A record on its way to a sink, a buffer or a logger leaves the pipeline,
// so it is cleaned through the utility slot.
func fclean(ctx *core.Context, record map[string]any) map[string]any {
	if ctx == nil || ctx.Utility == nil || ctx.Utility.Clean == nil {
		return record
	}
	if out, ok := ctx.Utility.Clean(ctx, record).(map[string]any); ok {
		return out
	}
	return record
}

func (f *BaseFeature) GetVersion() string { return f.Version }
func (f *BaseFeature) GetName() string    { return f.Name }
func (f *BaseFeature) GetActive() bool    { return f.Active }

func (f *BaseFeature) Init(ctx *core.Context, options map[string]any)  {}
func (f *BaseFeature) PostConstruct(ctx *core.Context)                 {}
func (f *BaseFeature) PostConstructEntity(ctx *core.Context)           {}
func (f *BaseFeature) SetData(ctx *core.Context)                       {}
func (f *BaseFeature) GetData(ctx *core.Context)                       {}
func (f *BaseFeature) GetMatch(ctx *core.Context)                      {}
func (f *BaseFeature) SetMatch(ctx *core.Context)                      {}
func (f *BaseFeature) PrePoint(ctx *core.Context)                      {}
func (f *BaseFeature) PreSpec(ctx *core.Context)                       {}
func (f *BaseFeature) PreRequest(ctx *core.Context)                    {}
func (f *BaseFeature) PreResponse(ctx *core.Context)                   {}
func (f *BaseFeature) PreResult(ctx *core.Context)                     {}
func (f *BaseFeature) PreDone(ctx *core.Context)                       {}
func (f *BaseFeature) PreUnexpected(ctx *core.Context)                 {}
