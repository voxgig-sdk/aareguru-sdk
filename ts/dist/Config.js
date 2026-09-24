"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FEATURE_PLUGINS = exports.config = void 0;
const RatelimitFeature_1 = require("./feature/ratelimit/RatelimitFeature");
const RetryFeature_1 = require("./feature/retry/RetryFeature");
const TestFeature_1 = require("./feature/test/TestFeature");
const TimeoutFeature_1 = require("./feature/timeout/TimeoutFeature");
const FEATURE_CLASS = {
    ratelimit: RatelimitFeature_1.RatelimitFeature,
    retry: RetryFeature_1.RetryFeature,
    test: TestFeature_1.TestFeature,
    timeout: TimeoutFeature_1.TimeoutFeature,
};
const FEATURE_PLUGINS = {};
exports.FEATURE_PLUGINS = FEATURE_PLUGINS;
class Config {
    makeFeature(fn) {
        const fc = FEATURE_CLASS[fn];
        const fi = new fc();
        return fi;
    }
    // False for a feature added at runtime via options.extend (station's
    // adopt path) - the constructor uses this to skip makeFeature for names
    // no generated class backs.
    hasFeature(fn) {
        return null != FEATURE_CLASS[fn];
    }
    main = {
        name: 'Aareguru',
        slug: "aareguru",
        version: "0.0.1",
        target: "ts",
    };
    feature = {
        ratelimit: {
            "options": {
                "active": false,
                "burst": 5,
                "rate": 5
            },
            "optspec": {
                "now": "`$FUNCTION`",
                "sleep": "`$FUNCTION`"
            },
            "strict": false,
            "transport": "wrap"
        },
        retry: {
            "options": {
                "active": false,
                "factor": 2,
                "maxDelay": 2000,
                "minDelay": 50,
                "retries": 2,
                "statuses": [
                    408,
                    425,
                    429,
                    500,
                    502,
                    503,
                    504
                ]
            },
            "optspec": {
                "jitter": "`$BOOLEAN`",
                "sleep": "`$FUNCTION`"
            },
            "strict": false,
            "transport": "wrap"
        },
        test: {
            "options": {
                "active": false
            },
            "optspec": {
                "entity": "`$MAP`",
                "net": "`$MAP`"
            },
            "strict": false,
            "transport": "base"
        },
        timeout: {
            "options": {
                "active": false,
                "ms": 30000
            },
            "optspec": {
                "clearTimer": "`$FUNCTION`",
                "setTimer": "`$FUNCTION`"
            },
            "strict": false,
            "transport": "wrap"
        },
    };
    options = {
        base: "https://aareguru.existenz.ch",
        headers: {
            "content-type": "application/json"
        },
        entity: {
            legacy: {},
            stuff: {},
            v2018: {},
        }
    };
    entity = {
        "legacy": {
            "fields": [],
            "name": "legacy",
            "op": {
                "load": {
                    "input": "data",
                    "name": "load",
                    "points": [
                        {
                            "kind": "http",
                            "method": "GET",
                            "orig": "/current",
                            "segments": [
                                {
                                    "lit": "current"
                                }
                            ],
                            "parts": [
                                "current"
                            ],
                            "rename": {},
                            "transform": {
                                "req": "`reqdata`",
                                "res": "`body`"
                            },
                            "args": {
                                "query": [
                                    {
                                        "name": "app",
                                        "orig": "app",
                                        "type": "`$STRING`",
                                        "kind": "query",
                                        "example": "my.app.ch"
                                    },
                                    {
                                        "name": "version",
                                        "orig": "version",
                                        "type": "`$STRING`",
                                        "kind": "query",
                                        "example": "1.0.42"
                                    }
                                ]
                            },
                            "select": {
                                "exist": [
                                    "app",
                                    "version"
                                ]
                            }
                        },
                        {
                            "kind": "http",
                            "method": "GET",
                            "orig": "/currentV2",
                            "segments": [
                                {
                                    "lit": "currentV2"
                                }
                            ],
                            "parts": [
                                "currentV2"
                            ],
                            "rename": {},
                            "transform": {
                                "req": "`reqdata`",
                                "res": "`body`"
                            },
                            "args": {
                                "query": [
                                    {
                                        "name": "app",
                                        "orig": "app",
                                        "type": "`$STRING`",
                                        "kind": "query",
                                        "example": "my.app.ch"
                                    },
                                    {
                                        "name": "version",
                                        "orig": "version",
                                        "type": "`$STRING`",
                                        "kind": "query",
                                        "example": "1.0.42"
                                    }
                                ]
                            },
                            "select": {
                                "exist": [
                                    "app",
                                    "version"
                                ]
                            }
                        },
                        {
                            "kind": "http",
                            "method": "GET",
                            "orig": "/today",
                            "segments": [
                                {
                                    "lit": "today"
                                }
                            ],
                            "parts": [
                                "today"
                            ],
                            "rename": {},
                            "transform": {
                                "req": "`reqdata`",
                                "res": "`body`"
                            },
                            "args": {
                                "query": [
                                    {
                                        "name": "app",
                                        "orig": "app",
                                        "type": "`$STRING`",
                                        "kind": "query",
                                        "example": "my.app.ch"
                                    },
                                    {
                                        "name": "version",
                                        "orig": "version",
                                        "type": "`$STRING`",
                                        "kind": "query",
                                        "example": "1.0.42"
                                    }
                                ]
                            },
                            "select": {
                                "exist": [
                                    "app",
                                    "version"
                                ]
                            }
                        }
                    ]
                }
            },
            "relations": {
                "ancestors": []
            }
        },
        "stuff": {
            "fields": [],
            "name": "stuff",
            "op": {
                "load": {
                    "input": "data",
                    "name": "load",
                    "points": [
                        {
                            "kind": "http",
                            "method": "GET",
                            "orig": "/logs",
                            "segments": [
                                {
                                    "lit": "logs"
                                }
                            ],
                            "parts": [
                                "logs"
                            ],
                            "rename": {},
                            "transform": {
                                "req": "`reqdata`",
                                "res": "`body`"
                            },
                            "args": {
                                "query": [
                                    {
                                        "name": "app",
                                        "orig": "app",
                                        "type": "`$STRING`",
                                        "kind": "query",
                                        "example": "my.app.ch"
                                    },
                                    {
                                        "name": "line",
                                        "orig": "line",
                                        "type": "`$INTEGER`",
                                        "kind": "query",
                                        "example": 12
                                    },
                                    {
                                        "name": "service",
                                        "orig": "service",
                                        "type": "`$STRING`",
                                        "kind": "query",
                                        "reqd": true,
                                        "example": "v2018_bueber"
                                    },
                                    {
                                        "name": "version",
                                        "orig": "version",
                                        "type": "`$STRING`",
                                        "kind": "query",
                                        "example": "1.0.42"
                                    }
                                ]
                            },
                            "select": {
                                "exist": [
                                    "app",
                                    "line",
                                    "service",
                                    "version"
                                ]
                            }
                        },
                        {
                            "kind": "http",
                            "method": "GET",
                            "orig": "/rawdata",
                            "segments": [
                                {
                                    "lit": "rawdata"
                                }
                            ],
                            "parts": [
                                "rawdata"
                            ],
                            "rename": {},
                            "transform": {
                                "req": "`reqdata`",
                                "res": "`body`"
                            },
                            "args": {
                                "query": [
                                    {
                                        "name": "app",
                                        "orig": "app",
                                        "type": "`$STRING`",
                                        "kind": "query",
                                        "example": "my.app.ch"
                                    },
                                    {
                                        "name": "service",
                                        "orig": "service",
                                        "type": "`$STRING`",
                                        "kind": "query",
                                        "reqd": true,
                                        "example": "v2018_bueber"
                                    },
                                    {
                                        "name": "version",
                                        "orig": "version",
                                        "type": "`$STRING`",
                                        "kind": "query",
                                        "example": "1.0.42"
                                    }
                                ]
                            },
                            "select": {
                                "exist": [
                                    "app",
                                    "service",
                                    "version"
                                ]
                            }
                        },
                        {
                            "kind": "http",
                            "method": "GET",
                            "orig": "/slack",
                            "segments": [
                                {
                                    "lit": "slack"
                                }
                            ],
                            "parts": [
                                "slack"
                            ],
                            "rename": {},
                            "transform": {
                                "req": "`reqdata`",
                                "res": "`body`"
                            },
                            "args": {},
                            "select": {}
                        }
                    ]
                }
            },
            "relations": {
                "ancestors": []
            }
        },
        "v2018": {
            "fields": [],
            "name": "v2018",
            "op": {
                "load": {
                    "input": "data",
                    "name": "load",
                    "points": [
                        {
                            "kind": "http",
                            "method": "GET",
                            "orig": "/v2018/history",
                            "segments": [
                                {
                                    "lit": "v2018"
                                },
                                {
                                    "lit": "history"
                                }
                            ],
                            "parts": [
                                "v2018",
                                "history"
                            ],
                            "rename": {},
                            "transform": {
                                "req": "`reqdata`",
                                "res": "`body`"
                            },
                            "args": {
                                "query": [
                                    {
                                        "name": "app",
                                        "orig": "app",
                                        "type": "`$STRING`",
                                        "kind": "query",
                                        "example": "my.app.ch"
                                    },
                                    {
                                        "name": "city",
                                        "orig": "city",
                                        "type": "`$STRING`",
                                        "kind": "query",
                                        "reqd": true,
                                        "example": "bern"
                                    },
                                    {
                                        "name": "end",
                                        "orig": "end",
                                        "type": "`$STRING`",
                                        "kind": "query",
                                        "reqd": true,
                                        "example": "2025-02-13"
                                    },
                                    {
                                        "name": "start",
                                        "orig": "start",
                                        "type": "`$STRING`",
                                        "kind": "query",
                                        "reqd": true,
                                        "example": "2025-01-01"
                                    },
                                    {
                                        "name": "value",
                                        "orig": "value",
                                        "type": "`$STRING`",
                                        "kind": "query",
                                        "example": null
                                    },
                                    {
                                        "name": "version",
                                        "orig": "version",
                                        "type": "`$STRING`",
                                        "kind": "query",
                                        "example": "1.0.42"
                                    }
                                ]
                            },
                            "select": {
                                "$action": "history",
                                "exist": [
                                    "app",
                                    "city",
                                    "end",
                                    "start",
                                    "value",
                                    "version"
                                ]
                            }
                        },
                        {
                            "kind": "http",
                            "method": "GET",
                            "orig": "/v2018/current",
                            "segments": [
                                {
                                    "lit": "v2018"
                                },
                                {
                                    "lit": "current"
                                }
                            ],
                            "parts": [
                                "v2018",
                                "current"
                            ],
                            "rename": {},
                            "transform": {
                                "req": "`reqdata`",
                                "res": "`body`"
                            },
                            "args": {
                                "query": [
                                    {
                                        "name": "app",
                                        "orig": "app",
                                        "type": "`$STRING`",
                                        "kind": "query",
                                        "example": "my.app.ch"
                                    },
                                    {
                                        "name": "city",
                                        "orig": "city",
                                        "type": "`$STRING`",
                                        "kind": "query",
                                        "example": "bern"
                                    },
                                    {
                                        "name": "value",
                                        "orig": "value",
                                        "type": "`$STRING`",
                                        "kind": "query",
                                        "example": null
                                    },
                                    {
                                        "name": "version",
                                        "orig": "version",
                                        "type": "`$STRING`",
                                        "kind": "query",
                                        "example": "1.0.42"
                                    }
                                ]
                            },
                            "select": {
                                "$action": "current",
                                "exist": [
                                    "app",
                                    "city",
                                    "value",
                                    "version"
                                ]
                            }
                        },
                        {
                            "kind": "http",
                            "method": "GET",
                            "orig": "/v2018/today",
                            "segments": [
                                {
                                    "lit": "v2018"
                                },
                                {
                                    "lit": "today"
                                }
                            ],
                            "parts": [
                                "v2018",
                                "today"
                            ],
                            "rename": {},
                            "transform": {
                                "req": "`reqdata`",
                                "res": "`body`"
                            },
                            "args": {
                                "query": [
                                    {
                                        "name": "app",
                                        "orig": "app",
                                        "type": "`$STRING`",
                                        "kind": "query",
                                        "example": "my.app.ch"
                                    },
                                    {
                                        "name": "city",
                                        "orig": "city",
                                        "type": "`$STRING`",
                                        "kind": "query",
                                        "example": "bern"
                                    },
                                    {
                                        "name": "value",
                                        "orig": "value",
                                        "type": "`$STRING`",
                                        "kind": "query",
                                        "example": null
                                    },
                                    {
                                        "name": "version",
                                        "orig": "version",
                                        "type": "`$STRING`",
                                        "kind": "query",
                                        "example": "1.0.42"
                                    }
                                ]
                            },
                            "select": {
                                "$action": "today",
                                "exist": [
                                    "app",
                                    "city",
                                    "value",
                                    "version"
                                ]
                            }
                        },
                        {
                            "kind": "http",
                            "method": "GET",
                            "orig": "/v2018/cities",
                            "segments": [
                                {
                                    "lit": "v2018"
                                },
                                {
                                    "lit": "cities"
                                }
                            ],
                            "parts": [
                                "v2018",
                                "cities"
                            ],
                            "rename": {},
                            "transform": {
                                "req": "`reqdata`",
                                "res": "`body`"
                            },
                            "args": {
                                "query": [
                                    {
                                        "name": "app",
                                        "orig": "app",
                                        "type": "`$STRING`",
                                        "kind": "query",
                                        "example": "my.app.ch"
                                    },
                                    {
                                        "name": "value",
                                        "orig": "value",
                                        "type": "`$STRING`",
                                        "kind": "query",
                                        "example": null
                                    },
                                    {
                                        "name": "version",
                                        "orig": "version",
                                        "type": "`$STRING`",
                                        "kind": "query",
                                        "example": "1.0.42"
                                    }
                                ]
                            },
                            "select": {
                                "$action": "city",
                                "exist": [
                                    "app",
                                    "value",
                                    "version"
                                ]
                            }
                        },
                        {
                            "kind": "http",
                            "method": "GET",
                            "orig": "/v2018/widget",
                            "segments": [
                                {
                                    "lit": "v2018"
                                },
                                {
                                    "lit": "widget"
                                }
                            ],
                            "parts": [
                                "v2018",
                                "widget"
                            ],
                            "rename": {},
                            "transform": {
                                "req": "`reqdata`",
                                "res": "`body`"
                            },
                            "args": {
                                "query": [
                                    {
                                        "name": "app",
                                        "orig": "app",
                                        "type": "`$STRING`",
                                        "kind": "query",
                                        "example": "my.app.ch"
                                    },
                                    {
                                        "name": "value",
                                        "orig": "value",
                                        "type": "`$STRING`",
                                        "kind": "query",
                                        "example": null
                                    },
                                    {
                                        "name": "version",
                                        "orig": "version",
                                        "type": "`$STRING`",
                                        "kind": "query",
                                        "example": "1.0.42"
                                    }
                                ]
                            },
                            "select": {
                                "$action": "widget",
                                "exist": [
                                    "app",
                                    "value",
                                    "version"
                                ]
                            }
                        }
                    ]
                }
            },
            "relations": {
                "ancestors": []
            }
        }
    };
}
const config = new Config();
exports.config = config;
//# sourceMappingURL=Config.js.map