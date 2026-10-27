package utility

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"

	vs "github.com/voxgig/struct"

	"GOMODULE/core"
)

// Proxied clients keyed by proxy URL. A client per request would open a
// fresh connection every call; a cached one pools like http.DefaultClient.
var proxyClients sync.Map

func clientFor(fetchdef map[string]any) *http.Client {
	client := http.DefaultClient

	if proxy, ok := fetchdef["proxy"].(string); ok && proxy != "" {
		if cached, ok := proxyClients.Load(proxy); ok {
			client = cached.(*http.Client)
		} else if proxyURL, perr := url.Parse(proxy); perr == nil {
			// http.DefaultTransport is a package variable the host program can
			// replace, and an unchecked assertion on it panics the SDK inside
			// whatever called it. Clone the real one where it is there, and
			// build a plain transport where it is not.
			var transport *http.Transport
			if def, ok := http.DefaultTransport.(*http.Transport); ok {
				transport = def.Clone()
			} else {
				transport = &http.Transport{}
			}
			transport.Proxy = http.ProxyURL(proxyURL)
			cached, _ := proxyClients.LoadOrStore(proxy, &http.Client{Transport: transport})
			client = cached.(*http.Client)
		}
	}

	// A shallow copy shares the pooled Transport; only CheckRedirect differs.
	if redirect, ok := fetchdef["redirect"].(string); ok && redirect == "manual" {
		manual := *client
		manual.CheckRedirect = func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		}
		client = &manual
	}

	return client
}

const getOnlyEnv = "VOXGIG_GETONLY_GUARD"

// A GET-only live run refuses any other method before it is sent. The error
// names the path alone: the query can carry a credential.
func getOnlyRefusal(fullurl string, method string) error {
	method = strings.ToUpper(method)
	if os.Getenv(getOnlyEnv) != "TRUE" || method == "GET" {
		return nil
	}
	rest := fullurl
	if i := strings.Index(rest, "://"); i >= 0 {
		rest = rest[i+3:]
		rest = rest[strings.IndexAny(rest+"/", "/?#"):]
	}
	path := rest[:strings.IndexAny(rest+"?", "?#")]
	if path == "" {
		path = "/"
	}
	return core.NewAareguruError("fetch_getonly_block",
		"[GET-ONLY GUARD] blocked "+method+" "+path, nil)
}

func defaultHTTPFetch(fullurl string, fetchdef map[string]any) (map[string]any, error) {
	method, _ := fetchdef["method"].(string)
	if method == "" {
		method = "GET"
	}
	if err := getOnlyRefusal(fullurl, method); err != nil {
		return nil, err
	}

	var bodyReader io.Reader
	switch body := fetchdef["body"].(type) {
	case string:
		if body != "" {
			bodyReader = strings.NewReader(body)
		}
	case []byte:
		bodyReader = bytes.NewReader(body)
	case io.Reader:
		bodyReader = body
	}

	req, err := http.NewRequest(method, fullurl, bodyReader)
	if err != nil {
		return nil, err
	}

	hasUA := false
	if headers, ok := fetchdef["headers"].(map[string]any); ok {
		for k, v := range headers {
			if sv, ok := v.(string); ok {
				if strings.EqualFold(k, "user-agent") {
					hasUA = true
				}
				req.Header.Set(k, sv)
			}
		}
	}
	// Default User-Agent — Go's net/http defaults to "Go-http-client/1.1"
	// which some CDNs block. Use a Mozilla-shaped UA unless the caller
	// already set one, and record it with the headers the request sent.
	if !hasUA {
		agent := "Mozilla/5.0 (compatible; AareguruSDK/1.0)"
		req.Header.Set("User-Agent", agent)
		if headers, ok := fetchdef["headers"].(map[string]any); ok {
			headers["user-agent"] = agent
		}
	}

	resp, err := clientFor(fetchdef).Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	headers := map[string]any{}
	for k, vals := range resp.Header {
		if len(vals) == 1 {
			headers[strings.ToLower(k)] = vals[0]
		} else {
			headers[strings.ToLower(k)] = strings.Join(vals, ", ")
		}
	}

	var jsonBody any
	unreadable := false
	if len(bytes.TrimSpace(bodyBytes)) > 0 {
		unreadable = json.Unmarshal(bodyBytes, &jsonBody) != nil
	}

	statusText := resp.Status
	if idx := strings.Index(statusText, " "); idx >= 0 {
		statusText = statusText[idx+1:]
	}

	return map[string]any{
		"status":     resp.StatusCode,
		"statusText": statusText,
		"headers":    headers,
		"json":       (func() any)(func() any { return jsonBody }),
		"body":       string(bodyBytes),
		"unreadable": unreadable,
	}, nil
}

func fetcherUtil(ctx *core.Context, fullurl string, fetchdef map[string]any) (any, error) {
	if ctx.Client.Mode != "live" {
		return nil, ctx.MakeError("fetch_mode_block",
			"Request blocked by mode: \""+ctx.Client.Mode+
				"\" (URL was: \""+fullurl+"\")")
	}

	options := ctx.Client.OptionsMap()
	if vs.GetPath(options, []any{"feature", "test", "active"}) == true {
		return nil, ctx.MakeError("fetch_test_block",
			"Request blocked as test feature is active"+
				" (URL was: \""+fullurl+"\")")
	}

	sysFetch := vs.GetPath(options, []any{"system", "fetch"})

	if sysFetch == nil {
		return defaultHTTPFetch(fullurl, fetchdef)
	}

	if fetchFunc, ok := sysFetch.(func(string, map[string]any) (map[string]any, error)); ok {
		return fetchFunc(fullurl, fetchdef)
	}

	return nil, ctx.MakeError("fetch_invalid", "system.fetch is not a valid function")
}
