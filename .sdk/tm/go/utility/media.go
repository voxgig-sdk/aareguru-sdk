package utility

import (
	"io"
	"strings"

	vs "github.com/voxgig/struct"
)

// The media types a point declares: `response` (the model's `rs`) for the
// Accept header, and `body` (the model's `rb`) for the request body.

// The data key of a raw request body; like `$action`, never an argument name.
const rawBodyKey = "$body"

func isJSONMedia(media string) bool {
	m := strings.ToLower(strings.TrimSpace(strings.SplitN(media, ";", 2)[0]))
	return "application/json" == m || "text/json" == m || strings.HasSuffix(m, "+json")
}

// The declared JSON type alone, else every declared type in model order; "" without a body.
func acceptOf(point map[string]any) string {
	res := vs.GetProp(point, "response")
	media, _ := vs.GetProp(res, "media").(string)
	if "" == media {
		return ""
	}
	if "json" == vs.GetProp(res, "kind") {
		return media
	}
	types := []string{media}
	if alts, ok := vs.GetProp(res, "alternatives").([]any); ok {
		for _, alt := range alts {
			if m, ok := vs.GetProp(alt, "media").(string); ok && "" != m {
				types = append(types, m)
			}
		}
	}
	return strings.Join(types, ", ")
}

func isRawRequest(point map[string]any) bool {
	return "raw" == vs.GetPath(point, []any{"body", "kind"})
}

func isJSONRequest(point map[string]any) bool {
	return "json" == vs.GetPath(point, []any{"body", "kind"})
}

// Bytes or a reader go as given. A map or a list is JSON, and so is a scalar
// on a point that declares a JSON body.
func requestBody(point map[string]any, body any) any {
	switch body.(type) {
	case []byte, io.Reader:
		return body
	}
	if vs.IsNode(body) || isJSONRequest(point) {
		return vs.Jsonify(body)
	}
	return body
}

func hasHeader(headers map[string]any, name string) bool {
	for key := range headers {
		if name == strings.ToLower(key) {
			return true
		}
	}
	return false
}

// A caller's accept wins. A declared request type replaces each JSON
// content-type, the SDK default, and leaves any other the caller set.
func mediaHeaders(point map[string]any, headers map[string]any) map[string]any {
	if accept := acceptOf(point); "" != accept && !hasHeader(headers, "accept") {
		headers["accept"] = accept
	}

	body := vs.GetProp(point, "body")
	kind, _ := vs.GetProp(body, "kind").(string)
	media, _ := vs.GetProp(body, "media").(string)
	if ("raw" == kind || "json" == kind) && "" != media {
		for key, val := range headers {
			if sv, ok := val.(string); ok && "content-type" == strings.ToLower(key) && isJSONMedia(sv) {
				delete(headers, key)
			}
		}
		if !hasHeader(headers, "content-type") {
			headers["content-type"] = media
		}
	}

	return headers
}

// Bytes, a reader or a string, sent as they are. A reader is read here, once,
// before the first attempt, so that a retry sends the same bytes again.
func rawBody(reqdata map[string]any) any {
	if nil == reqdata {
		return nil
	}
	body := reqdata[rawBodyKey]
	if r, ok := body.(io.Reader); ok {
		data, err := io.ReadAll(r)
		if err != nil {
			return err
		}
		return data
	}
	return body
}
