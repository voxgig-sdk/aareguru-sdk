package core

type AareguruError struct {
	IsAareguruError bool
	Sdk              string
	Code             string
	Msg              string
	Ctx              *Context
	Result           any
	Spec             any
}

func NewAareguruError(code string, msg string, ctx *Context) *AareguruError {
	return &AareguruError{
		IsAareguruError: true,
		Sdk:              "Aareguru",
		Code:             code,
		Msg:              msg,
		Ctx:              ctx,
	}
}

func (e *AareguruError) Error() string {
	return e.Msg
}
