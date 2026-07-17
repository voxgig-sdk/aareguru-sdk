-- Aareguru SDK configuration

local function make_config()
  return {
    main = {
      name = "Aareguru",
    },
    feature = {
      ["test"] = {
        ["options"] = {
          ["active"] = false,
        },
      },
    },
    options = {
      base = "https://aareguru.existenz.ch",
      headers = {
        ["content-type"] = "application/json",
      },
      entity = {
        ["legacy"] = {},
        ["stuff"] = {},
        ["v2018"] = {},
      },
    },
    entity = {
      ["legacy"] = {
        ["fields"] = {},
        ["name"] = "legacy",
        ["op"] = {
          ["load"] = {
            ["input"] = "data",
            ["name"] = "load",
            ["points"] = {
              {
                ["active"] = true,
                ["args"] = {
                  ["query"] = {
                    {
                      ["active"] = true,
                      ["example"] = "my.app.ch",
                      ["kind"] = "query",
                      ["name"] = "app",
                      ["orig"] = "app",
                      ["reqd"] = false,
                      ["type"] = "`$STRING`",
                    },
                    {
                      ["active"] = true,
                      ["example"] = "1.0.42",
                      ["kind"] = "query",
                      ["name"] = "version",
                      ["orig"] = "version",
                      ["reqd"] = false,
                      ["type"] = "`$STRING`",
                    },
                  },
                },
                ["method"] = "GET",
                ["orig"] = "/current",
                ["parts"] = {
                  "current",
                },
                ["select"] = {
                  ["exist"] = {
                    "app",
                    "version",
                  },
                },
                ["transform"] = {
                  ["req"] = "`reqdata`",
                  ["res"] = "`body`",
                },
                ["index$"] = 0,
              },
              {
                ["active"] = true,
                ["args"] = {
                  ["query"] = {
                    {
                      ["active"] = true,
                      ["example"] = "my.app.ch",
                      ["kind"] = "query",
                      ["name"] = "app",
                      ["orig"] = "app",
                      ["reqd"] = false,
                      ["type"] = "`$STRING`",
                    },
                    {
                      ["active"] = true,
                      ["example"] = "1.0.42",
                      ["kind"] = "query",
                      ["name"] = "version",
                      ["orig"] = "version",
                      ["reqd"] = false,
                      ["type"] = "`$STRING`",
                    },
                  },
                },
                ["method"] = "GET",
                ["orig"] = "/currentV2",
                ["parts"] = {
                  "currentV2",
                },
                ["select"] = {
                  ["exist"] = {
                    "app",
                    "version",
                  },
                },
                ["transform"] = {
                  ["req"] = "`reqdata`",
                  ["res"] = "`body`",
                },
                ["index$"] = 1,
              },
              {
                ["active"] = true,
                ["args"] = {
                  ["query"] = {
                    {
                      ["active"] = true,
                      ["example"] = "my.app.ch",
                      ["kind"] = "query",
                      ["name"] = "app",
                      ["orig"] = "app",
                      ["reqd"] = false,
                      ["type"] = "`$STRING`",
                    },
                    {
                      ["active"] = true,
                      ["example"] = "1.0.42",
                      ["kind"] = "query",
                      ["name"] = "version",
                      ["orig"] = "version",
                      ["reqd"] = false,
                      ["type"] = "`$STRING`",
                    },
                  },
                },
                ["method"] = "GET",
                ["orig"] = "/today",
                ["parts"] = {
                  "today",
                },
                ["select"] = {
                  ["exist"] = {
                    "app",
                    "version",
                  },
                },
                ["transform"] = {
                  ["req"] = "`reqdata`",
                  ["res"] = "`body`",
                },
                ["index$"] = 2,
              },
            },
            ["key$"] = "load",
          },
        },
        ["relations"] = {
          ["ancestors"] = {},
        },
      },
      ["stuff"] = {
        ["fields"] = {},
        ["name"] = "stuff",
        ["op"] = {
          ["load"] = {
            ["input"] = "data",
            ["name"] = "load",
            ["points"] = {
              {
                ["active"] = true,
                ["args"] = {
                  ["query"] = {
                    {
                      ["active"] = true,
                      ["example"] = "my.app.ch",
                      ["kind"] = "query",
                      ["name"] = "app",
                      ["orig"] = "app",
                      ["reqd"] = false,
                      ["type"] = "`$STRING`",
                    },
                    {
                      ["active"] = true,
                      ["example"] = 12,
                      ["kind"] = "query",
                      ["name"] = "line",
                      ["orig"] = "line",
                      ["reqd"] = false,
                      ["type"] = "`$INTEGER`",
                    },
                    {
                      ["active"] = true,
                      ["example"] = "v2018_bueber",
                      ["kind"] = "query",
                      ["name"] = "service",
                      ["orig"] = "service",
                      ["reqd"] = true,
                      ["type"] = "`$STRING`",
                    },
                    {
                      ["active"] = true,
                      ["example"] = "1.0.42",
                      ["kind"] = "query",
                      ["name"] = "version",
                      ["orig"] = "version",
                      ["reqd"] = false,
                      ["type"] = "`$STRING`",
                    },
                  },
                },
                ["method"] = "GET",
                ["orig"] = "/logs",
                ["parts"] = {
                  "logs",
                },
                ["select"] = {
                  ["exist"] = {
                    "app",
                    "line",
                    "service",
                    "version",
                  },
                },
                ["transform"] = {
                  ["req"] = "`reqdata`",
                  ["res"] = "`body`",
                },
                ["index$"] = 0,
              },
              {
                ["active"] = true,
                ["args"] = {
                  ["query"] = {
                    {
                      ["active"] = true,
                      ["example"] = "my.app.ch",
                      ["kind"] = "query",
                      ["name"] = "app",
                      ["orig"] = "app",
                      ["reqd"] = false,
                      ["type"] = "`$STRING`",
                    },
                    {
                      ["active"] = true,
                      ["example"] = "v2018_bueber",
                      ["kind"] = "query",
                      ["name"] = "service",
                      ["orig"] = "service",
                      ["reqd"] = true,
                      ["type"] = "`$STRING`",
                    },
                    {
                      ["active"] = true,
                      ["example"] = "1.0.42",
                      ["kind"] = "query",
                      ["name"] = "version",
                      ["orig"] = "version",
                      ["reqd"] = false,
                      ["type"] = "`$STRING`",
                    },
                  },
                },
                ["method"] = "GET",
                ["orig"] = "/rawdata",
                ["parts"] = {
                  "rawdata",
                },
                ["select"] = {
                  ["exist"] = {
                    "app",
                    "service",
                    "version",
                  },
                },
                ["transform"] = {
                  ["req"] = "`reqdata`",
                  ["res"] = "`body`",
                },
                ["index$"] = 1,
              },
              {
                ["active"] = true,
                ["args"] = {},
                ["method"] = "GET",
                ["orig"] = "/slack",
                ["parts"] = {
                  "slack",
                },
                ["select"] = {},
                ["transform"] = {
                  ["req"] = "`reqdata`",
                  ["res"] = "`body`",
                },
                ["index$"] = 2,
              },
            },
            ["key$"] = "load",
          },
        },
        ["relations"] = {
          ["ancestors"] = {},
        },
      },
      ["v2018"] = {
        ["fields"] = {},
        ["name"] = "v2018",
        ["op"] = {
          ["load"] = {
            ["input"] = "data",
            ["name"] = "load",
            ["points"] = {
              {
                ["active"] = true,
                ["args"] = {
                  ["query"] = {
                    {
                      ["active"] = true,
                      ["example"] = "my.app.ch",
                      ["kind"] = "query",
                      ["name"] = "app",
                      ["orig"] = "app",
                      ["reqd"] = false,
                      ["type"] = "`$STRING`",
                    },
                    {
                      ["active"] = true,
                      ["example"] = "bern",
                      ["kind"] = "query",
                      ["name"] = "city",
                      ["orig"] = "city",
                      ["reqd"] = true,
                      ["type"] = "`$STRING`",
                    },
                    {
                      ["active"] = true,
                      ["example"] = "2025-02-13",
                      ["kind"] = "query",
                      ["name"] = "end",
                      ["orig"] = "end",
                      ["reqd"] = true,
                      ["type"] = "`$STRING`",
                    },
                    {
                      ["active"] = true,
                      ["example"] = "2025-01-01",
                      ["kind"] = "query",
                      ["name"] = "start",
                      ["orig"] = "start",
                      ["reqd"] = true,
                      ["type"] = "`$STRING`",
                    },
                    {
                      ["active"] = true,
                      ["example"] = nil,
                      ["kind"] = "query",
                      ["name"] = "value",
                      ["orig"] = "value",
                      ["reqd"] = false,
                      ["type"] = "`$STRING`",
                    },
                    {
                      ["active"] = true,
                      ["example"] = "1.0.42",
                      ["kind"] = "query",
                      ["name"] = "version",
                      ["orig"] = "version",
                      ["reqd"] = false,
                      ["type"] = "`$STRING`",
                    },
                  },
                },
                ["method"] = "GET",
                ["orig"] = "/v2018/history",
                ["parts"] = {
                  "v2018",
                  "history",
                },
                ["select"] = {
                  ["$action"] = "history",
                  ["exist"] = {
                    "app",
                    "city",
                    "end",
                    "start",
                    "value",
                    "version",
                  },
                },
                ["transform"] = {
                  ["req"] = "`reqdata`",
                  ["res"] = "`body`",
                },
                ["index$"] = 0,
              },
              {
                ["active"] = true,
                ["args"] = {
                  ["query"] = {
                    {
                      ["active"] = true,
                      ["example"] = "my.app.ch",
                      ["kind"] = "query",
                      ["name"] = "app",
                      ["orig"] = "app",
                      ["reqd"] = false,
                      ["type"] = "`$STRING`",
                    },
                    {
                      ["active"] = true,
                      ["example"] = "bern",
                      ["kind"] = "query",
                      ["name"] = "city",
                      ["orig"] = "city",
                      ["reqd"] = false,
                      ["type"] = "`$STRING`",
                    },
                    {
                      ["active"] = true,
                      ["example"] = nil,
                      ["kind"] = "query",
                      ["name"] = "value",
                      ["orig"] = "value",
                      ["reqd"] = false,
                      ["type"] = "`$STRING`",
                    },
                    {
                      ["active"] = true,
                      ["example"] = "1.0.42",
                      ["kind"] = "query",
                      ["name"] = "version",
                      ["orig"] = "version",
                      ["reqd"] = false,
                      ["type"] = "`$STRING`",
                    },
                  },
                },
                ["method"] = "GET",
                ["orig"] = "/v2018/current",
                ["parts"] = {
                  "v2018",
                  "current",
                },
                ["select"] = {
                  ["$action"] = "current",
                  ["exist"] = {
                    "app",
                    "city",
                    "value",
                    "version",
                  },
                },
                ["transform"] = {
                  ["req"] = "`reqdata`",
                  ["res"] = "`body`",
                },
                ["index$"] = 1,
              },
              {
                ["active"] = true,
                ["args"] = {
                  ["query"] = {
                    {
                      ["active"] = true,
                      ["example"] = "my.app.ch",
                      ["kind"] = "query",
                      ["name"] = "app",
                      ["orig"] = "app",
                      ["reqd"] = false,
                      ["type"] = "`$STRING`",
                    },
                    {
                      ["active"] = true,
                      ["example"] = "bern",
                      ["kind"] = "query",
                      ["name"] = "city",
                      ["orig"] = "city",
                      ["reqd"] = false,
                      ["type"] = "`$STRING`",
                    },
                    {
                      ["active"] = true,
                      ["example"] = nil,
                      ["kind"] = "query",
                      ["name"] = "value",
                      ["orig"] = "value",
                      ["reqd"] = false,
                      ["type"] = "`$STRING`",
                    },
                    {
                      ["active"] = true,
                      ["example"] = "1.0.42",
                      ["kind"] = "query",
                      ["name"] = "version",
                      ["orig"] = "version",
                      ["reqd"] = false,
                      ["type"] = "`$STRING`",
                    },
                  },
                },
                ["method"] = "GET",
                ["orig"] = "/v2018/today",
                ["parts"] = {
                  "v2018",
                  "today",
                },
                ["select"] = {
                  ["$action"] = "today",
                  ["exist"] = {
                    "app",
                    "city",
                    "value",
                    "version",
                  },
                },
                ["transform"] = {
                  ["req"] = "`reqdata`",
                  ["res"] = "`body`",
                },
                ["index$"] = 2,
              },
              {
                ["active"] = true,
                ["args"] = {
                  ["query"] = {
                    {
                      ["active"] = true,
                      ["example"] = "my.app.ch",
                      ["kind"] = "query",
                      ["name"] = "app",
                      ["orig"] = "app",
                      ["reqd"] = false,
                      ["type"] = "`$STRING`",
                    },
                    {
                      ["active"] = true,
                      ["example"] = nil,
                      ["kind"] = "query",
                      ["name"] = "value",
                      ["orig"] = "value",
                      ["reqd"] = false,
                      ["type"] = "`$STRING`",
                    },
                    {
                      ["active"] = true,
                      ["example"] = "1.0.42",
                      ["kind"] = "query",
                      ["name"] = "version",
                      ["orig"] = "version",
                      ["reqd"] = false,
                      ["type"] = "`$STRING`",
                    },
                  },
                },
                ["method"] = "GET",
                ["orig"] = "/v2018/cities",
                ["parts"] = {
                  "v2018",
                  "cities",
                },
                ["select"] = {
                  ["$action"] = "city",
                  ["exist"] = {
                    "app",
                    "value",
                    "version",
                  },
                },
                ["transform"] = {
                  ["req"] = "`reqdata`",
                  ["res"] = "`body`",
                },
                ["index$"] = 3,
              },
              {
                ["active"] = true,
                ["args"] = {
                  ["query"] = {
                    {
                      ["active"] = true,
                      ["example"] = "my.app.ch",
                      ["kind"] = "query",
                      ["name"] = "app",
                      ["orig"] = "app",
                      ["reqd"] = false,
                      ["type"] = "`$STRING`",
                    },
                    {
                      ["active"] = true,
                      ["example"] = nil,
                      ["kind"] = "query",
                      ["name"] = "value",
                      ["orig"] = "value",
                      ["reqd"] = false,
                      ["type"] = "`$STRING`",
                    },
                    {
                      ["active"] = true,
                      ["example"] = "1.0.42",
                      ["kind"] = "query",
                      ["name"] = "version",
                      ["orig"] = "version",
                      ["reqd"] = false,
                      ["type"] = "`$STRING`",
                    },
                  },
                },
                ["method"] = "GET",
                ["orig"] = "/v2018/widget",
                ["parts"] = {
                  "v2018",
                  "widget",
                },
                ["select"] = {
                  ["$action"] = "widget",
                  ["exist"] = {
                    "app",
                    "value",
                    "version",
                  },
                },
                ["transform"] = {
                  ["req"] = "`reqdata`",
                  ["res"] = "`body`",
                },
                ["index$"] = 4,
              },
            },
            ["key$"] = "load",
          },
        },
        ["relations"] = {
          ["ancestors"] = {},
        },
      },
    },
  }
end


local function make_feature(name)
  local features = require("features")
  local factory = features[name]
  if factory ~= nil then
    return factory()
  end
  return features.base()
end


-- Attach make_feature to the SDK class
local function setup_sdk(SDK)
  SDK._make_feature = make_feature
end


return make_config
