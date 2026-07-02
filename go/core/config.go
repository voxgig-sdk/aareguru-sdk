package core

func MakeConfig() map[string]any {
	return map[string]any{
		"main": map[string]any{
			"name": "Aareguru",
		},
		"feature": map[string]any{
			"test": map[string]any{
				"options": map[string]any{
					"active": false,
				},
			},
		},
		"options": map[string]any{
			"base": "https://aareguru.existenz.ch",
			"auth": map[string]any{
				"prefix": "Bearer",
			},
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
								"active": true,
								"args": map[string]any{
									"query": []any{
										map[string]any{
											"active": true,
											"example": "my.app.ch",
											"kind": "query",
											"name": "app",
											"orig": "app",
											"reqd": false,
											"type": "`$STRING`",
										},
										map[string]any{
											"active": true,
											"example": "1.0.42",
											"kind": "query",
											"name": "version",
											"orig": "version",
											"reqd": false,
											"type": "`$STRING`",
										},
									},
								},
								"method": "GET",
								"orig": "/current",
								"parts": []any{
									"current",
								},
								"select": map[string]any{
									"exist": []any{
										"app",
										"version",
									},
								},
								"transform": map[string]any{
									"req": "`reqdata`",
									"res": "`body`",
								},
								"index$": 0,
							},
							map[string]any{
								"active": true,
								"args": map[string]any{
									"query": []any{
										map[string]any{
											"active": true,
											"example": "my.app.ch",
											"kind": "query",
											"name": "app",
											"orig": "app",
											"reqd": false,
											"type": "`$STRING`",
										},
										map[string]any{
											"active": true,
											"example": "1.0.42",
											"kind": "query",
											"name": "version",
											"orig": "version",
											"reqd": false,
											"type": "`$STRING`",
										},
									},
								},
								"method": "GET",
								"orig": "/currentV2",
								"parts": []any{
									"currentV2",
								},
								"select": map[string]any{
									"exist": []any{
										"app",
										"version",
									},
								},
								"transform": map[string]any{
									"req": "`reqdata`",
									"res": "`body`",
								},
								"index$": 1,
							},
							map[string]any{
								"active": true,
								"args": map[string]any{
									"query": []any{
										map[string]any{
											"active": true,
											"example": "my.app.ch",
											"kind": "query",
											"name": "app",
											"orig": "app",
											"reqd": false,
											"type": "`$STRING`",
										},
										map[string]any{
											"active": true,
											"example": "1.0.42",
											"kind": "query",
											"name": "version",
											"orig": "version",
											"reqd": false,
											"type": "`$STRING`",
										},
									},
								},
								"method": "GET",
								"orig": "/today",
								"parts": []any{
									"today",
								},
								"select": map[string]any{
									"exist": []any{
										"app",
										"version",
									},
								},
								"transform": map[string]any{
									"req": "`reqdata`",
									"res": "`body`",
								},
								"index$": 2,
							},
						},
						"key$": "load",
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
								"active": true,
								"args": map[string]any{
									"query": []any{
										map[string]any{
											"active": true,
											"example": "my.app.ch",
											"kind": "query",
											"name": "app",
											"orig": "app",
											"reqd": false,
											"type": "`$STRING`",
										},
										map[string]any{
											"active": true,
											"example": 12,
											"kind": "query",
											"name": "line",
											"orig": "line",
											"reqd": false,
											"type": "`$INTEGER`",
										},
										map[string]any{
											"active": true,
											"example": "v2018_bueber",
											"kind": "query",
											"name": "service",
											"orig": "service",
											"reqd": true,
											"type": "`$STRING`",
										},
										map[string]any{
											"active": true,
											"example": "1.0.42",
											"kind": "query",
											"name": "version",
											"orig": "version",
											"reqd": false,
											"type": "`$STRING`",
										},
									},
								},
								"method": "GET",
								"orig": "/logs",
								"parts": []any{
									"logs",
								},
								"select": map[string]any{
									"exist": []any{
										"app",
										"line",
										"service",
										"version",
									},
								},
								"transform": map[string]any{
									"req": "`reqdata`",
									"res": "`body`",
								},
								"index$": 0,
							},
							map[string]any{
								"active": true,
								"args": map[string]any{
									"query": []any{
										map[string]any{
											"active": true,
											"example": "my.app.ch",
											"kind": "query",
											"name": "app",
											"orig": "app",
											"reqd": false,
											"type": "`$STRING`",
										},
										map[string]any{
											"active": true,
											"example": "v2018_bueber",
											"kind": "query",
											"name": "service",
											"orig": "service",
											"reqd": true,
											"type": "`$STRING`",
										},
										map[string]any{
											"active": true,
											"example": "1.0.42",
											"kind": "query",
											"name": "version",
											"orig": "version",
											"reqd": false,
											"type": "`$STRING`",
										},
									},
								},
								"method": "GET",
								"orig": "/rawdata",
								"parts": []any{
									"rawdata",
								},
								"select": map[string]any{
									"exist": []any{
										"app",
										"service",
										"version",
									},
								},
								"transform": map[string]any{
									"req": "`reqdata`",
									"res": "`body`",
								},
								"index$": 1,
							},
							map[string]any{
								"active": true,
								"args": map[string]any{},
								"method": "GET",
								"orig": "/slack",
								"parts": []any{
									"slack",
								},
								"select": map[string]any{},
								"transform": map[string]any{
									"req": "`reqdata`",
									"res": "`body`",
								},
								"index$": 2,
							},
						},
						"key$": "load",
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
								"active": true,
								"args": map[string]any{
									"query": []any{
										map[string]any{
											"active": true,
											"example": "my.app.ch",
											"kind": "query",
											"name": "app",
											"orig": "app",
											"reqd": false,
											"type": "`$STRING`",
										},
										map[string]any{
											"active": true,
											"example": "bern",
											"kind": "query",
											"name": "city",
											"orig": "city",
											"reqd": true,
											"type": "`$STRING`",
										},
										map[string]any{
											"active": true,
											"example": "2025-02-13",
											"kind": "query",
											"name": "end",
											"orig": "end",
											"reqd": true,
											"type": "`$STRING`",
										},
										map[string]any{
											"active": true,
											"example": "2025-01-01",
											"kind": "query",
											"name": "start",
											"orig": "start",
											"reqd": true,
											"type": "`$STRING`",
										},
										map[string]any{
											"active": true,
											"example": nil,
											"kind": "query",
											"name": "value",
											"orig": "value",
											"reqd": false,
											"type": "`$STRING`",
										},
										map[string]any{
											"active": true,
											"example": "1.0.42",
											"kind": "query",
											"name": "version",
											"orig": "version",
											"reqd": false,
											"type": "`$STRING`",
										},
									},
								},
								"method": "GET",
								"orig": "/v2018/history",
								"parts": []any{
									"v2018",
									"history",
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
								"transform": map[string]any{
									"req": "`reqdata`",
									"res": "`body`",
								},
								"index$": 0,
							},
							map[string]any{
								"active": true,
								"args": map[string]any{
									"query": []any{
										map[string]any{
											"active": true,
											"example": "my.app.ch",
											"kind": "query",
											"name": "app",
											"orig": "app",
											"reqd": false,
											"type": "`$STRING`",
										},
										map[string]any{
											"active": true,
											"example": "bern",
											"kind": "query",
											"name": "city",
											"orig": "city",
											"reqd": false,
											"type": "`$STRING`",
										},
										map[string]any{
											"active": true,
											"example": nil,
											"kind": "query",
											"name": "value",
											"orig": "value",
											"reqd": false,
											"type": "`$STRING`",
										},
										map[string]any{
											"active": true,
											"example": "1.0.42",
											"kind": "query",
											"name": "version",
											"orig": "version",
											"reqd": false,
											"type": "`$STRING`",
										},
									},
								},
								"method": "GET",
								"orig": "/v2018/current",
								"parts": []any{
									"v2018",
									"current",
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
								"transform": map[string]any{
									"req": "`reqdata`",
									"res": "`body`",
								},
								"index$": 1,
							},
							map[string]any{
								"active": true,
								"args": map[string]any{
									"query": []any{
										map[string]any{
											"active": true,
											"example": "my.app.ch",
											"kind": "query",
											"name": "app",
											"orig": "app",
											"reqd": false,
											"type": "`$STRING`",
										},
										map[string]any{
											"active": true,
											"example": "bern",
											"kind": "query",
											"name": "city",
											"orig": "city",
											"reqd": false,
											"type": "`$STRING`",
										},
										map[string]any{
											"active": true,
											"example": nil,
											"kind": "query",
											"name": "value",
											"orig": "value",
											"reqd": false,
											"type": "`$STRING`",
										},
										map[string]any{
											"active": true,
											"example": "1.0.42",
											"kind": "query",
											"name": "version",
											"orig": "version",
											"reqd": false,
											"type": "`$STRING`",
										},
									},
								},
								"method": "GET",
								"orig": "/v2018/today",
								"parts": []any{
									"v2018",
									"today",
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
								"transform": map[string]any{
									"req": "`reqdata`",
									"res": "`body`",
								},
								"index$": 2,
							},
							map[string]any{
								"active": true,
								"args": map[string]any{
									"query": []any{
										map[string]any{
											"active": true,
											"example": "my.app.ch",
											"kind": "query",
											"name": "app",
											"orig": "app",
											"reqd": false,
											"type": "`$STRING`",
										},
										map[string]any{
											"active": true,
											"example": nil,
											"kind": "query",
											"name": "value",
											"orig": "value",
											"reqd": false,
											"type": "`$STRING`",
										},
										map[string]any{
											"active": true,
											"example": "1.0.42",
											"kind": "query",
											"name": "version",
											"orig": "version",
											"reqd": false,
											"type": "`$STRING`",
										},
									},
								},
								"method": "GET",
								"orig": "/v2018/cities",
								"parts": []any{
									"v2018",
									"cities",
								},
								"select": map[string]any{
									"$action": "city",
									"exist": []any{
										"app",
										"value",
										"version",
									},
								},
								"transform": map[string]any{
									"req": "`reqdata`",
									"res": "`body`",
								},
								"index$": 3,
							},
							map[string]any{
								"active": true,
								"args": map[string]any{
									"query": []any{
										map[string]any{
											"active": true,
											"example": "my.app.ch",
											"kind": "query",
											"name": "app",
											"orig": "app",
											"reqd": false,
											"type": "`$STRING`",
										},
										map[string]any{
											"active": true,
											"example": nil,
											"kind": "query",
											"name": "value",
											"orig": "value",
											"reqd": false,
											"type": "`$STRING`",
										},
										map[string]any{
											"active": true,
											"example": "1.0.42",
											"kind": "query",
											"name": "version",
											"orig": "version",
											"reqd": false,
											"type": "`$STRING`",
										},
									},
								},
								"method": "GET",
								"orig": "/v2018/widget",
								"parts": []any{
									"v2018",
									"widget",
								},
								"select": map[string]any{
									"$action": "widget",
									"exist": []any{
										"app",
										"value",
										"version",
									},
								},
								"transform": map[string]any{
									"req": "`reqdata`",
									"res": "`body`",
								},
								"index$": 4,
							},
						},
						"key$": "load",
					},
				},
				"relations": map[string]any{
					"ancestors": []any{},
				},
			},
		},
	}
}

func makeFeature(name string) Feature {
	switch name {
	case "test":
		if NewTestFeatureFunc != nil {
			return NewTestFeatureFunc()
		}
	default:
		if NewBaseFeatureFunc != nil {
			return NewBaseFeatureFunc()
		}
	}
	return nil
}
