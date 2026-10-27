package core

type Feature interface {
	GetVersion() string
	GetName() string
	GetActive() bool

	Init(ctx *Context, options map[string]any)

	PostConstruct(ctx *Context)
	PostConstructEntity(ctx *Context)
	SetData(ctx *Context)
	GetData(ctx *Context)
	GetMatch(ctx *Context)

	PrePoint(ctx *Context)
	PreSpec(ctx *Context)
	PreRequest(ctx *Context)
	PreResponse(ctx *Context)
	PreResult(ctx *Context)
	PreDone(ctx *Context)
	PreUnexpected(ctx *Context)
	SetMatch(ctx *Context)
}

type Entity interface {
	GetName() string
	Make() Entity
	Data(data ...any) any
	Match(match ...any) any

	MarkDeleted()
	Deleted() bool
}

type AareguruEntity interface {
	Entity
	Load(reqmatch map[string]any, ctrl map[string]any) (any, error)
	List(reqmatch map[string]any, ctrl map[string]any) (any, error)
	Create(reqdata map[string]any, ctrl map[string]any) (any, error)
	Update(reqdata map[string]any, ctrl map[string]any) (any, error)
	Patch(reqdata map[string]any, ctrl map[string]any) (any, error)
	Remove(reqmatch map[string]any, ctrl map[string]any) (any, error)
	Stream(action string, args map[string]any, callopts map[string]any) <-chan StreamItem
}

// A StreamItem is one value from an entity's Stream channel: an item of the
// result, or the error that ended the stream, which is sent last.
type StreamItem struct {
	Item any
	Err  error
}

type FetcherFunc func(ctx *Context, fullurl string, fetchdef map[string]any) (any, error)
