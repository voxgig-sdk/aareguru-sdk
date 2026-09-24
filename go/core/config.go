package core

import (
	"sync"
)

// MakeConfig builds a fresh, fully materialised config map. Every call
// rebuilds the whole structure, so prefer SharedConfig unless you need a
// private copy you intend to mutate.
func MakeConfig() map[string]any {
	return map[string]any{
		"main": map[string]any{
			"name": "Aareguru",
			"slug": "aareguru",
			"version": "0.0.1",
			"target": "go",
		},
		"feature": map[string]any{
			"ratelimit": map[string]any{
				"options": map[string]any{
					"active": false,
					"burst": 5,
					"rate": 5,
				},
				"optspec": map[string]any{
					"now": "`$FUNCTION`",
					"sleep": "`$FUNCTION`",
				},
				"strict": false,
				"transport": "wrap",
			},
			"retry": map[string]any{
				"options": map[string]any{
					"active": false,
					"factor": 2,
					"maxDelay": 2000,
					"minDelay": 50,
					"retries": 2,
					"statuses": []any{
						408,
						425,
						429,
						500,
						502,
						503,
						504,
					},
				},
				"optspec": map[string]any{
					"jitter": "`$BOOLEAN`",
					"sleep": "`$FUNCTION`",
				},
				"strict": false,
				"transport": "wrap",
			},
			"test": map[string]any{
				"options": map[string]any{
					"active": false,
				},
				"optspec": map[string]any{
					"entity": "`$MAP`",
					"net": "`$MAP`",
				},
				"strict": false,
				"transport": "base",
			},
			"timeout": map[string]any{
				"options": map[string]any{
					"active": false,
					"ms": 30000,
				},
				"optspec": map[string]any{
					"clearTimer": "`$FUNCTION`",
					"setTimer": "`$FUNCTION`",
				},
				"strict": false,
				"transport": "wrap",
			},
		},
		"options": map[string]any{
			"base": "https://aareguru.existenz.ch",
			"headers": map[string]any{
				"content-type": "application/json",
			},
			"entity": map[string]any{
				"legacy": map[string]any{},
				"stuff": map[string]any{},
				"v2018": map[string]any{},
			},
		},
		"entity": map[string]any{
			"legacy": map[string]any{
				"fields": []any{},
				"name": "legacy",
				"op": map[string]any{
					"load": map[string]any{
						"input": "data",
						"name": "load",
						"points": []any{
							map[string]any{
								"kind": "http",
								"method": "GET",
								"orig": "/current",
								"segments": []any{
									map[string]any{
										"lit": "current",
									},
								},
								"parts": []any{
									"current",
								},
								"rename": map[string]any{},
								"transform": map[string]any{
									"req": "`reqdata`",
									"res": "`body`",
								},
								"args": map[string]any{
									"query": []any{
										map[string]any{
											"name": "app",
											"orig": "app",
											"type": "`$STRING`",
											"kind": "query",
											"example": "my.app.ch",
										},
										map[string]any{
											"name": "version",
											"orig": "version",
											"type": "`$STRING`",
											"kind": "query",
											"example": "1.0.42",
										},
									},
								},
								"select": map[string]any{
									"exist": []any{
										"app",
										"version",
									},
								},
							},
							map[string]any{
								"kind": "http",
								"method": "GET",
								"orig": "/currentV2",
								"segments": []any{
									map[string]any{
										"lit": "currentV2",
									},
								},
								"parts": []any{
									"currentV2",
								},
								"rename": map[string]any{},
								"transform": map[string]any{
									"req": "`reqdata`",
									"res": "`body`",
								},
								"args": map[string]any{
									"query": []any{
										map[string]any{
											"name": "app",
											"orig": "app",
											"type": "`$STRING`",
											"kind": "query",
											"example": "my.app.ch",
										},
										map[string]any{
											"name": "version",
											"orig": "version",
											"type": "`$STRING`",
											"kind": "query",
											"example": "1.0.42",
										},
									},
								},
								"select": map[string]any{
									"exist": []any{
										"app",
										"version",
									},
								},
							},
							map[string]any{
								"kind": "http",
								"method": "GET",
								"orig": "/today",
								"segments": []any{
									map[string]any{
										"lit": "today",
									},
								},
								"parts": []any{
									"today",
								},
								"rename": map[string]any{},
								"transform": map[string]any{
									"req": "`reqdata`",
									"res": "`body`",
								},
								"args": map[string]any{
									"query": []any{
										map[string]any{
											"name": "app",
											"orig": "app",
											"type": "`$STRING`",
											"kind": "query",
											"example": "my.app.ch",
										},
										map[string]any{
											"name": "version",
											"orig": "version",
											"type": "`$STRING`",
											"kind": "query",
											"example": "1.0.42",
										},
									},
								},
								"select": map[string]any{
									"exist": []any{
										"app",
										"version",
									},
								},
							},
						},
					},
				},
				"relations": map[string]any{
					"ancestors": []any{},
				},
			},
			"stuff": map[string]any{
				"fields": []any{},
				"name": "stuff",
				"op": map[string]any{
					"load": map[string]any{
						"input": "data",
						"name": "load",
						"points": []any{
							map[string]any{
								"kind": "http",
								"method": "GET",
								"orig": "/logs",
								"segments": []any{
									map[string]any{
										"lit": "logs",
									},
								},
								"parts": []any{
									"logs",
								},
								"rename": map[string]any{},
								"transform": map[string]any{
									"req": "`reqdata`",
									"res": "`body`",
								},
								"args": map[string]any{
									"query": []any{
										map[string]any{
											"name": "app",
											"orig": "app",
											"type": "`$STRING`",
											"kind": "query",
											"example": "my.app.ch",
										},
										map[string]any{
											"name": "line",
											"orig": "line",
											"type": "`$INTEGER`",
											"kind": "query",
											"example": 12,
										},
										map[string]any{
											"name": "service",
											"orig": "service",
											"type": "`$STRING`",
											"kind": "query",
											"reqd": true,
											"example": "v2018_bueber",
										},
										map[string]any{
											"name": "version",
											"orig": "version",
											"type": "`$STRING`",
											"kind": "query",
											"example": "1.0.42",
										},
									},
								},
								"select": map[string]any{
									"exist": []any{
										"app",
										"line",
										"service",
										"version",
									},
								},
							},
							map[string]any{
								"kind": "http",
								"method": "GET",
								"orig": "/rawdata",
								"segments": []any{
									map[string]any{
										"lit": "rawdata",
									},
								},
								"parts": []any{
									"rawdata",
								},
								"rename": map[string]any{},
								"transform": map[string]any{
									"req": "`reqdata`",
									"res": "`body`",
								},
								"args": map[string]any{
									"query": []any{
										map[string]any{
											"name": "app",
											"orig": "app",
											"type": "`$STRING`",
											"kind": "query",
											"example": "my.app.ch",
										},
										map[string]any{
											"name": "service",
											"orig": "service",
											"type": "`$STRING`",
											"kind": "query",
											"reqd": true,
											"example": "v2018_bueber",
										},
										map[string]any{
											"name": "version",
											"orig": "version",
											"type": "`$STRING`",
											"kind": "query",
											"example": "1.0.42",
										},
									},
								},
								"select": map[string]any{
									"exist": []any{
										"app",
										"service",
										"version",
									},
								},
							},
							map[string]any{
								"kind": "http",
								"method": "GET",
								"orig": "/slack",
								"segments": []any{
									map[string]any{
										"lit": "slack",
									},
								},
								"parts": []any{
									"slack",
								},
								"rename": map[string]any{},
								"transform": map[string]any{
									"req": "`reqdata`",
									"res": "`body`",
								},
								"args": map[string]any{},
								"select": map[string]any{},
							},
						},
					},
				},
				"relations": map[string]any{
					"ancestors": []any{},
				},
			},
			"v2018": map[string]any{
				"fields": []any{},
				"name": "v2018",
				"op": map[string]any{
					"load": map[string]any{
						"input": "data",
						"name": "load",
						"points": []any{
							map[string]any{
								"kind": "http",
								"method": "GET",
								"orig": "/v2018/history",
								"segments": []any{
									map[string]any{
										"lit": "v2018",
									},
									map[string]any{
										"lit": "history",
									},
								},
								"parts": []any{
									"v2018",
									"history",
								},
								"rename": map[string]any{},
								"transform": map[string]any{
									"req": "`reqdata`",
									"res": "`body`",
								},
								"args": map[string]any{
									"query": []any{
										map[string]any{
											"name": "app",
											"orig": "app",
											"type": "`$STRING`",
											"kind": "query",
											"example": "my.app.ch",
										},
										map[string]any{
											"name": "city",
											"orig": "city",
											"type": "`$STRING`",
											"kind": "query",
											"reqd": true,
											"example": "bern",
										},
										map[string]any{
											"name": "end",
											"orig": "end",
											"type": "`$STRING`",
											"kind": "query",
											"reqd": true,
											"example": "2025-02-13",
										},
										map[string]any{
											"name": "start",
											"orig": "start",
											"type": "`$STRING`",
											"kind": "query",
											"reqd": true,
											"example": "2025-01-01",
										},
										map[string]any{
											"name": "value",
											"orig": "value",
											"type": "`$STRING`",
											"kind": "query",
											"example": nil,
										},
										map[string]any{
											"name": "version",
											"orig": "version",
											"type": "`$STRING`",
											"kind": "query",
											"example": "1.0.42",
										},
									},
								},
								"select": map[string]any{
									"$action": "history",
									"exist": []any{
										"app",
										"city",
										"end",
										"start",
										"value",
										"version",
									},
								},
							},
							map[string]any{
								"kind": "http",
								"method": "GET",
								"orig": "/v2018/current",
								"segments": []any{
									map[string]any{
										"lit": "v2018",
									},
									map[string]any{
										"lit": "current",
									},
								},
								"parts": []any{
									"v2018",
									"current",
								},
								"rename": map[string]any{},
								"transform": map[string]any{
									"req": "`reqdata`",
									"res": "`body`",
								},
								"args": map[string]any{
									"query": []any{
										map[string]any{
											"name": "app",
											"orig": "app",
											"type": "`$STRING`",
											"kind": "query",
											"example": "my.app.ch",
										},
										map[string]any{
											"name": "city",
											"orig": "city",
											"type": "`$STRING`",
											"kind": "query",
											"example": "bern",
										},
										map[string]any{
											"name": "value",
											"orig": "value",
											"type": "`$STRING`",
											"kind": "query",
											"example": nil,
										},
										map[string]any{
											"name": "version",
											"orig": "version",
											"type": "`$STRING`",
											"kind": "query",
											"example": "1.0.42",
										},
									},
								},
								"select": map[string]any{
									"$action": "current",
									"exist": []any{
										"app",
										"city",
										"value",
										"version",
									},
								},
							},
							map[string]any{
								"kind": "http",
								"method": "GET",
								"orig": "/v2018/today",
								"segments": []any{
									map[string]any{
										"lit": "v2018",
									},
									map[string]any{
										"lit": "today",
									},
								},
								"parts": []any{
									"v2018",
									"today",
								},
								"rename": map[string]any{},
								"transform": map[string]any{
									"req": "`reqdata`",
									"res": "`body`",
								},
								"args": map[string]any{
									"query": []any{
										map[string]any{
											"name": "app",
											"orig": "app",
											"type": "`$STRING`",
											"kind": "query",
											"example": "my.app.ch",
										},
										map[string]any{
											"name": "city",
											"orig": "city",
											"type": "`$STRING`",
											"kind": "query",
											"example": "bern",
										},
										map[string]any{
											"name": "value",
											"orig": "value",
											"type": "`$STRING`",
											"kind": "query",
											"example": nil,
										},
										map[string]any{
											"name": "version",
											"orig": "version",
											"type": "`$STRING`",
											"kind": "query",
											"example": "1.0.42",
										},
									},
								},
								"select": map[string]any{
									"$action": "today",
									"exist": []any{
										"app",
										"city",
										"value",
										"version",
									},
								},
							},
							map[string]any{
								"kind": "http",
								"method": "GET",
								"orig": "/v2018/cities",
								"segments": []any{
									map[string]any{
										"lit": "v2018",
									},
									map[string]any{
										"lit": "cities",
									},
								},
								"parts": []any{
									"v2018",
									"cities",
								},
								"rename": map[string]any{},
								"transform": map[string]any{
									"req": "`reqdata`",
									"res": "`body`",
								},
								"args": map[string]any{
									"query": []any{
										map[string]any{
											"name": "app",
											"orig": "app",
											"type": "`$STRING`",
											"kind": "query",
											"example": "my.app.ch",
										},
										map[string]any{
											"name": "value",
											"orig": "value",
											"type": "`$STRING`",
											"kind": "query",
											"example": nil,
										},
										map[string]any{
											"name": "version",
											"orig": "version",
											"type": "`$STRING`",
											"kind": "query",
											"example": "1.0.42",
										},
									},
								},
								"select": map[string]any{
									"$action": "city",
									"exist": []any{
										"app",
										"value",
										"version",
									},
								},
							},
							map[string]any{
								"kind": "http",
								"method": "GET",
								"orig": "/v2018/widget",
								"segments": []any{
									map[string]any{
										"lit": "v2018",
									},
									map[string]any{
										"lit": "widget",
									},
								},
								"parts": []any{
									"v2018",
									"widget",
								},
								"rename": map[string]any{},
								"transform": map[string]any{
									"req": "`reqdata`",
									"res": "`body`",
								},
								"args": map[string]any{
									"query": []any{
										map[string]any{
											"name": "app",
											"orig": "app",
											"type": "`$STRING`",
											"kind": "query",
											"example": "my.app.ch",
										},
										map[string]any{
											"name": "value",
											"orig": "value",
											"type": "`$STRING`",
											"kind": "query",
											"example": nil,
										},
										map[string]any{
											"name": "version",
											"orig": "version",
											"type": "`$STRING`",
											"kind": "query",
											"example": "1.0.42",
										},
									},
								},
								"select": map[string]any{
									"$action": "widget",
									"exist": []any{
										"app",
										"value",
										"version",
									},
								},
							},
						},
					},
				},
				"relations": map[string]any{
					"ancestors": []any{},
				},
			},
		},
	}
}

// The plugin definitions the model selected per feature, as []any so a
// feature package can consume them without core naming its types. Empty
// when no active feature declares active plugin groups for this target.
var featurePlugins = map[string][]any{
}

// FeaturePlugins is the definitions list for one feature's chain.
func FeaturePlugins(name string) []any {
	return featurePlugins[name]
}

var (
	sharedConfigOnce sync.Once
	sharedConfigVal  map[string]any
)

// SharedConfig returns the process-wide config, built once on first use.
// The SDK reads the config on every request and never writes to it, so one
// instance is shared by every client rather than rebuilt per client.
//
// The returned map is shared: treat it as read-only. Callers that need to
// mutate should use MakeConfig, which always returns a fresh copy.
func SharedConfig() map[string]any {
	sharedConfigOnce.Do(func() {
		sharedConfigVal = MakeConfig()
	})
	return sharedConfigVal
}

func makeFeature(name string) Feature {
	switch name {
	case "ratelimit":
		if NewRatelimitFeatureFunc != nil {
			return NewRatelimitFeatureFunc()
		}
	case "retry":
		if NewRetryFeatureFunc != nil {
			return NewRetryFeatureFunc()
		}
	case "test":
		if NewTestFeatureFunc != nil {
			return NewTestFeatureFunc()
		}
	case "timeout":
		if NewTimeoutFeatureFunc != nil {
			return NewTimeoutFeatureFunc()
		}
	default:
		if NewBaseFeatureFunc != nil {
			return NewBaseFeatureFunc()
		}
	}
	return nil
}
