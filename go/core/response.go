package core

import (
	"fmt"
	"regexp"
	"strings"

	vs "github.com/voxgig-sdk/aareguru-sdk/go/utility/struct"
)

type Response struct {
	Status     int
	StatusText string
	Headers    any
	JsonFunc   func() any
	Body       any
	Err        error
	// Set by a transport that could not read a non-blank body as JSON.
	Unreadable bool
}

func NewResponse(resmap map[string]any) *Response {
	status := -1
	if s := vs.GetProp(resmap, "status"); s != nil {
		status = ToInt(s)
	}

	statusText := ""
	if st := vs.GetProp(resmap, "statusText"); st != nil {
		if s, ok := st.(string); ok {
			statusText = s
		}
	}

	headers := vs.GetProp(resmap, "headers")

	var jsonFunc func() any
	if jf := vs.GetProp(resmap, "json"); jf != nil {
		if f, ok := jf.(func() any); ok {
			jsonFunc = f
		}
	}

	body := vs.GetProp(resmap, "body")

	var err error
	if e := vs.GetProp(resmap, "err"); e != nil {
		if er, ok := e.(error); ok {
			err = er
		}
	}

	unreadable, _ := vs.GetProp(resmap, "unreadable").(bool)

	return &Response{
		Status:     status,
		StatusText: statusText,
		Headers:    headers,
		JsonFunc:   jsonFunc,
		Body:       body,
		Err:        err,
		Unreadable: unreadable,
	}
}

const previewLength = 160

var spaceRun = regexp.MustCompile(`\s+`)

// UnreadableBody describes a body that is not JSON. An HTTP failure keeps its
// own error, with the response described; otherwise the code tells a wrong
// content type from malformed JSON.
func UnreadableBody(ctx *Context, status int, headers any, text any, sent any, failed error) error {
	ctype := headerValue(headers, "content-type")
	agent, _ := ctx.Utility.Clean(ctx, headerValue(sent, "user-agent")).(string)
	if agent == "" {
		agent = "transport default"
	}
	shown := ctype
	if shown == "" {
		shown = "none"
	}
	detail := fmt.Sprintf("HTTP %d, content-type %s, user-agent %s", status, shown, agent)
	if text != nil {
		detail += ", body: " + bodyPreview(ctx, text)
	}

	if failed != nil {
		if pe, ok := failed.(*AareguruError); ok {
			pe.Msg += " (" + detail + ")"
			return pe
		}
		return fmt.Errorf("%s (%s)", failed.Error(), detail)
	}

	if ctype == "" || strings.Contains(strings.ToLower(ctype), "json") {
		return ctx.MakeError("response_json_invalid", "response: body is not valid JSON ("+detail+")")
	}
	return ctx.MakeError("response_content_type",
		"response: expected JSON, got "+ctype+" ("+detail+")")
}

func headerValue(headers any, name string) string {
	hm, ok := headers.(map[string]any)
	if !ok {
		return ""
	}
	for key, val := range hm {
		if strings.EqualFold(key, name) {
			return fmt.Sprint(val)
		}
	}
	return ""
}

// Cleaned whole: a secret the bound would split could leave its prefix.
func bodyPreview(ctx *Context, text any) string {
	flat := strings.TrimSpace(spaceRun.ReplaceAllString(fmt.Sprint(text), " "))
	if cleaned, ok := ctx.Utility.Clean(ctx, flat).(string); ok {
		flat = cleaned
	}
	runes := []rune(flat)
	if len(runes) > previewLength {
		return string(runes[:previewLength]) + "..."
	}
	return flat
}
