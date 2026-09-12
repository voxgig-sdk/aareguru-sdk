# Aareguru SDK configuration


# The sekreto plugin DEFINITIONS the model selected per feature, imported
# above by name from the modules the catalogue's active `plugin.def`
# entries declare. Handed to each feature (secrets builds its Sekreto
# with them): a provider kind not listed here is unknown to that SDK.
FEATURE_PLUGINS = {
}


_shared_config = None


def shared_config():
    """Return the process-wide config, built once on first use.

    The SDK reads the config on every request and never writes to it, so one
    instance is shared by every client rather than rebuilt per client.

    The returned dict is shared: treat it as read-only. Callers that need to
    mutate should use make_config, which always returns a fresh copy.
    """
    global _shared_config
    if _shared_config is None:
        _shared_config = make_config()
    return _shared_config


def make_config():
    """Build a fresh, fully materialised config dict.

    Every call rebuilds the whole structure, so prefer shared_config unless
    you need a private copy you intend to mutate.
    """
    return {
        "main": {
            "name": "Aareguru",
            "slug": "aareguru",
            "version": "0.0.1",
            "target": "py",
        },
        "feature": {
            "test": {
        "options": {
          "active": False,
        },
        "transport": "base",
      },
        },
        "options": {
            "base": "https://aareguru.existenz.ch",
            "headers": {
        "content-type": "application/json",
      },
            "entity": {
                "legacy": {},
                "stuff": {},
                "v2018": {},
            },
        },
        "entity": {
      "legacy": {
        "fields": [],
        "name": "legacy",
        "op": {
          "load": {
            "input": "data",
            "name": "load",
            "points": [
              {
                "args": {
                  "query": [
                    {
                      "example": "my.app.ch",
                      "kind": "query",
                      "name": "app",
                      "orig": "app",
                      "type": "`$STRING`",
                    },
                    {
                      "example": "1.0.42",
                      "kind": "query",
                      "name": "version",
                      "orig": "version",
                      "type": "`$STRING`",
                    },
                  ],
                },
                "kind": "http",
                "method": "GET",
                "orig": "/current",
                "segments": [
                  {
                    "lit": "current",
                  },
                ],
                "select": {
                  "exist": [
                    "app",
                    "version",
                  ],
                },
                "transform": {
                  "req": "`reqdata`",
                  "res": "`body`",
                },
                "parts": [
                  "current",
                ],
              },
              {
                "args": {
                  "query": [
                    {
                      "example": "my.app.ch",
                      "kind": "query",
                      "name": "app",
                      "orig": "app",
                      "type": "`$STRING`",
                    },
                    {
                      "example": "1.0.42",
                      "kind": "query",
                      "name": "version",
                      "orig": "version",
                      "type": "`$STRING`",
                    },
                  ],
                },
                "kind": "http",
                "method": "GET",
                "orig": "/currentV2",
                "segments": [
                  {
                    "lit": "currentV2",
                  },
                ],
                "select": {
                  "exist": [
                    "app",
                    "version",
                  ],
                },
                "transform": {
                  "req": "`reqdata`",
                  "res": "`body`",
                },
                "parts": [
                  "currentV2",
                ],
              },
              {
                "args": {
                  "query": [
                    {
                      "example": "my.app.ch",
                      "kind": "query",
                      "name": "app",
                      "orig": "app",
                      "type": "`$STRING`",
                    },
                    {
                      "example": "1.0.42",
                      "kind": "query",
                      "name": "version",
                      "orig": "version",
                      "type": "`$STRING`",
                    },
                  ],
                },
                "kind": "http",
                "method": "GET",
                "orig": "/today",
                "segments": [
                  {
                    "lit": "today",
                  },
                ],
                "select": {
                  "exist": [
                    "app",
                    "version",
                  ],
                },
                "transform": {
                  "req": "`reqdata`",
                  "res": "`body`",
                },
                "parts": [
                  "today",
                ],
              },
            ],
          },
        },
        "relations": {
          "ancestors": [],
        },
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
                "args": {
                  "query": [
                    {
                      "example": "my.app.ch",
                      "kind": "query",
                      "name": "app",
                      "orig": "app",
                      "type": "`$STRING`",
                    },
                    {
                      "example": 12,
                      "kind": "query",
                      "name": "line",
                      "orig": "line",
                      "type": "`$INTEGER`",
                    },
                    {
                      "example": "v2018_bueber",
                      "kind": "query",
                      "name": "service",
                      "orig": "service",
                      "reqd": True,
                      "type": "`$STRING`",
                    },
                    {
                      "example": "1.0.42",
                      "kind": "query",
                      "name": "version",
                      "orig": "version",
                      "type": "`$STRING`",
                    },
                  ],
                },
                "kind": "http",
                "method": "GET",
                "orig": "/logs",
                "segments": [
                  {
                    "lit": "logs",
                  },
                ],
                "select": {
                  "exist": [
                    "app",
                    "line",
                    "service",
                    "version",
                  ],
                },
                "transform": {
                  "req": "`reqdata`",
                  "res": "`body`",
                },
                "parts": [
                  "logs",
                ],
              },
              {
                "args": {
                  "query": [
                    {
                      "example": "my.app.ch",
                      "kind": "query",
                      "name": "app",
                      "orig": "app",
                      "type": "`$STRING`",
                    },
                    {
                      "example": "v2018_bueber",
                      "kind": "query",
                      "name": "service",
                      "orig": "service",
                      "reqd": True,
                      "type": "`$STRING`",
                    },
                    {
                      "example": "1.0.42",
                      "kind": "query",
                      "name": "version",
                      "orig": "version",
                      "type": "`$STRING`",
                    },
                  ],
                },
                "kind": "http",
                "method": "GET",
                "orig": "/rawdata",
                "segments": [
                  {
                    "lit": "rawdata",
                  },
                ],
                "select": {
                  "exist": [
                    "app",
                    "service",
                    "version",
                  ],
                },
                "transform": {
                  "req": "`reqdata`",
                  "res": "`body`",
                },
                "parts": [
                  "rawdata",
                ],
              },
              {
                "args": {},
                "kind": "http",
                "method": "GET",
                "orig": "/slack",
                "segments": [
                  {
                    "lit": "slack",
                  },
                ],
                "select": {},
                "transform": {
                  "req": "`reqdata`",
                  "res": "`body`",
                },
                "parts": [
                  "slack",
                ],
              },
            ],
          },
        },
        "relations": {
          "ancestors": [],
        },
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
                "args": {
                  "query": [
                    {
                      "example": "my.app.ch",
                      "kind": "query",
                      "name": "app",
                      "orig": "app",
                      "type": "`$STRING`",
                    },
                    {
                      "example": "bern",
                      "kind": "query",
                      "name": "city",
                      "orig": "city",
                      "reqd": True,
                      "type": "`$STRING`",
                    },
                    {
                      "example": "2025-02-13",
                      "kind": "query",
                      "name": "end",
                      "orig": "end",
                      "reqd": True,
                      "type": "`$STRING`",
                    },
                    {
                      "example": "2025-01-01",
                      "kind": "query",
                      "name": "start",
                      "orig": "start",
                      "reqd": True,
                      "type": "`$STRING`",
                    },
                    {
                      "example": None,
                      "kind": "query",
                      "name": "value",
                      "orig": "value",
                      "type": "`$STRING`",
                    },
                    {
                      "example": "1.0.42",
                      "kind": "query",
                      "name": "version",
                      "orig": "version",
                      "type": "`$STRING`",
                    },
                  ],
                },
                "kind": "http",
                "method": "GET",
                "orig": "/v2018/history",
                "segments": [
                  {
                    "lit": "v2018",
                  },
                  {
                    "lit": "history",
                  },
                ],
                "select": {
                  "$action": "history",
                  "exist": [
                    "app",
                    "city",
                    "end",
                    "start",
                    "value",
                    "version",
                  ],
                },
                "transform": {
                  "req": "`reqdata`",
                  "res": "`body`",
                },
                "parts": [
                  "v2018",
                  "history",
                ],
              },
              {
                "args": {
                  "query": [
                    {
                      "example": "my.app.ch",
                      "kind": "query",
                      "name": "app",
                      "orig": "app",
                      "type": "`$STRING`",
                    },
                    {
                      "example": "bern",
                      "kind": "query",
                      "name": "city",
                      "orig": "city",
                      "type": "`$STRING`",
                    },
                    {
                      "example": None,
                      "kind": "query",
                      "name": "value",
                      "orig": "value",
                      "type": "`$STRING`",
                    },
                    {
                      "example": "1.0.42",
                      "kind": "query",
                      "name": "version",
                      "orig": "version",
                      "type": "`$STRING`",
                    },
                  ],
                },
                "kind": "http",
                "method": "GET",
                "orig": "/v2018/current",
                "segments": [
                  {
                    "lit": "v2018",
                  },
                  {
                    "lit": "current",
                  },
                ],
                "select": {
                  "$action": "current",
                  "exist": [
                    "app",
                    "city",
                    "value",
                    "version",
                  ],
                },
                "transform": {
                  "req": "`reqdata`",
                  "res": "`body`",
                },
                "parts": [
                  "v2018",
                  "current",
                ],
              },
              {
                "args": {
                  "query": [
                    {
                      "example": "my.app.ch",
                      "kind": "query",
                      "name": "app",
                      "orig": "app",
                      "type": "`$STRING`",
                    },
                    {
                      "example": "bern",
                      "kind": "query",
                      "name": "city",
                      "orig": "city",
                      "type": "`$STRING`",
                    },
                    {
                      "example": None,
                      "kind": "query",
                      "name": "value",
                      "orig": "value",
                      "type": "`$STRING`",
                    },
                    {
                      "example": "1.0.42",
                      "kind": "query",
                      "name": "version",
                      "orig": "version",
                      "type": "`$STRING`",
                    },
                  ],
                },
                "kind": "http",
                "method": "GET",
                "orig": "/v2018/today",
                "segments": [
                  {
                    "lit": "v2018",
                  },
                  {
                    "lit": "today",
                  },
                ],
                "select": {
                  "$action": "today",
                  "exist": [
                    "app",
                    "city",
                    "value",
                    "version",
                  ],
                },
                "transform": {
                  "req": "`reqdata`",
                  "res": "`body`",
                },
                "parts": [
                  "v2018",
                  "today",
                ],
              },
              {
                "args": {
                  "query": [
                    {
                      "example": "my.app.ch",
                      "kind": "query",
                      "name": "app",
                      "orig": "app",
                      "type": "`$STRING`",
                    },
                    {
                      "example": None,
                      "kind": "query",
                      "name": "value",
                      "orig": "value",
                      "type": "`$STRING`",
                    },
                    {
                      "example": "1.0.42",
                      "kind": "query",
                      "name": "version",
                      "orig": "version",
                      "type": "`$STRING`",
                    },
                  ],
                },
                "kind": "http",
                "method": "GET",
                "orig": "/v2018/cities",
                "segments": [
                  {
                    "lit": "v2018",
                  },
                  {
                    "lit": "cities",
                  },
                ],
                "select": {
                  "$action": "city",
                  "exist": [
                    "app",
                    "value",
                    "version",
                  ],
                },
                "transform": {
                  "req": "`reqdata`",
                  "res": "`body`",
                },
                "parts": [
                  "v2018",
                  "cities",
                ],
              },
              {
                "args": {
                  "query": [
                    {
                      "example": "my.app.ch",
                      "kind": "query",
                      "name": "app",
                      "orig": "app",
                      "type": "`$STRING`",
                    },
                    {
                      "example": None,
                      "kind": "query",
                      "name": "value",
                      "orig": "value",
                      "type": "`$STRING`",
                    },
                    {
                      "example": "1.0.42",
                      "kind": "query",
                      "name": "version",
                      "orig": "version",
                      "type": "`$STRING`",
                    },
                  ],
                },
                "kind": "http",
                "method": "GET",
                "orig": "/v2018/widget",
                "segments": [
                  {
                    "lit": "v2018",
                  },
                  {
                    "lit": "widget",
                  },
                ],
                "select": {
                  "$action": "widget",
                  "exist": [
                    "app",
                    "value",
                    "version",
                  ],
                },
                "transform": {
                  "req": "`reqdata`",
                  "res": "`body`",
                },
                "parts": [
                  "v2018",
                  "widget",
                ],
              },
            ],
          },
        },
        "relations": {
          "ancestors": [],
        },
      },
    },
    }
