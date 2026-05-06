# Aareguru SDK configuration

module AareguruConfig
  def self.make_config
    {
      "main" => {
        "name" => "Aareguru",
      },
      "feature" => {
        "test" => {
          "options" => {
            "active" => false,
          },
        },
      },
      "options" => {
        "base" => "https://aareguru.existenz.ch",
        "auth" => {
          "prefix" => "Bearer",
        },
        "headers" => {
          "content-type" => "application/json",
        },
        "entity" => {
          "legacy" => {},
          "stuff" => {},
          "v2018" => {},
        },
      },
      "entity" => {
        "legacy" => {
          "fields" => [],
          "name" => "legacy",
          "op" => {
            "load" => {
              "name" => "load",
              "points" => [
                {
                  "args" => {
                    "query" => [
                      {
                        "kind" => "query",
                        "name" => "app",
                        "orig" => "app",
                        "reqd" => false,
                        "type" => "`$STRING`",
                      },
                      {
                        "kind" => "query",
                        "name" => "version",
                        "orig" => "version",
                        "reqd" => false,
                        "type" => "`$STRING`",
                      },
                    ],
                    "params" => [],
                  },
                  "method" => "GET",
                  "orig" => "/current",
                  "parts" => [
                    "current",
                  ],
                  "select" => {
                    "exist" => [
                      "app",
                      "version",
                    ],
                  },
                  "transform" => {
                    "req" => "`reqdata`",
                    "res" => "`body`",
                  },
                  "active" => true,
                  "index$" => 0,
                },
                {
                  "args" => {
                    "query" => [
                      {
                        "kind" => "query",
                        "name" => "app",
                        "orig" => "app",
                        "reqd" => false,
                        "type" => "`$STRING`",
                      },
                      {
                        "kind" => "query",
                        "name" => "version",
                        "orig" => "version",
                        "reqd" => false,
                        "type" => "`$STRING`",
                      },
                    ],
                    "params" => [],
                  },
                  "method" => "GET",
                  "orig" => "/currentV2",
                  "parts" => [
                    "currentV2",
                  ],
                  "select" => {
                    "exist" => [
                      "app",
                      "version",
                    ],
                  },
                  "transform" => {
                    "req" => "`reqdata`",
                    "res" => "`body`",
                  },
                  "active" => true,
                  "index$" => 1,
                },
                {
                  "args" => {
                    "query" => [
                      {
                        "kind" => "query",
                        "name" => "app",
                        "orig" => "app",
                        "reqd" => false,
                        "type" => "`$STRING`",
                      },
                      {
                        "kind" => "query",
                        "name" => "version",
                        "orig" => "version",
                        "reqd" => false,
                        "type" => "`$STRING`",
                      },
                    ],
                    "params" => [],
                  },
                  "method" => "GET",
                  "orig" => "/today",
                  "parts" => [
                    "today",
                  ],
                  "select" => {
                    "exist" => [
                      "app",
                      "version",
                    ],
                  },
                  "transform" => {
                    "req" => "`reqdata`",
                    "res" => "`body`",
                  },
                  "active" => true,
                  "index$" => 2,
                },
              ],
              "input" => "data",
              "key$" => "load",
            },
          },
          "relations" => {
            "ancestors" => [],
          },
        },
        "stuff" => {
          "fields" => [],
          "name" => "stuff",
          "op" => {
            "load" => {
              "name" => "load",
              "points" => [
                {
                  "args" => {
                    "query" => [
                      {
                        "kind" => "query",
                        "name" => "app",
                        "orig" => "app",
                        "reqd" => false,
                        "type" => "`$STRING`",
                      },
                      {
                        "kind" => "query",
                        "name" => "line",
                        "orig" => "line",
                        "reqd" => false,
                        "type" => "`$INTEGER`",
                      },
                      {
                        "kind" => "query",
                        "name" => "service",
                        "orig" => "service",
                        "reqd" => true,
                        "type" => "`$STRING`",
                      },
                      {
                        "kind" => "query",
                        "name" => "version",
                        "orig" => "version",
                        "reqd" => false,
                        "type" => "`$STRING`",
                      },
                    ],
                    "params" => [],
                  },
                  "method" => "GET",
                  "orig" => "/logs",
                  "parts" => [
                    "logs",
                  ],
                  "select" => {
                    "exist" => [
                      "app",
                      "line",
                      "service",
                      "version",
                    ],
                  },
                  "transform" => {
                    "req" => "`reqdata`",
                    "res" => "`body`",
                  },
                  "active" => true,
                  "index$" => 0,
                },
                {
                  "args" => {
                    "query" => [
                      {
                        "kind" => "query",
                        "name" => "app",
                        "orig" => "app",
                        "reqd" => false,
                        "type" => "`$STRING`",
                      },
                      {
                        "kind" => "query",
                        "name" => "service",
                        "orig" => "service",
                        "reqd" => true,
                        "type" => "`$STRING`",
                      },
                      {
                        "kind" => "query",
                        "name" => "version",
                        "orig" => "version",
                        "reqd" => false,
                        "type" => "`$STRING`",
                      },
                    ],
                    "params" => [],
                  },
                  "method" => "GET",
                  "orig" => "/rawdata",
                  "parts" => [
                    "rawdata",
                  ],
                  "select" => {
                    "exist" => [
                      "app",
                      "service",
                      "version",
                    ],
                  },
                  "transform" => {
                    "req" => "`reqdata`",
                    "res" => "`body`",
                  },
                  "active" => true,
                  "index$" => 1,
                },
                {
                  "method" => "GET",
                  "orig" => "/slack",
                  "parts" => [
                    "slack",
                  ],
                  "transform" => {
                    "req" => "`reqdata`",
                    "res" => "`body`",
                  },
                  "active" => true,
                  "args" => {
                    "params" => [],
                  },
                  "select" => {},
                  "index$" => 2,
                },
              ],
              "input" => "data",
              "key$" => "load",
            },
          },
          "relations" => {
            "ancestors" => [],
          },
        },
        "v2018" => {
          "fields" => [],
          "name" => "v2018",
          "op" => {
            "load" => {
              "name" => "load",
              "points" => [
                {
                  "args" => {
                    "query" => [
                      {
                        "kind" => "query",
                        "name" => "app",
                        "orig" => "app",
                        "reqd" => false,
                        "type" => "`$STRING`",
                      },
                      {
                        "kind" => "query",
                        "name" => "city",
                        "orig" => "city",
                        "reqd" => true,
                        "type" => "`$STRING`",
                      },
                      {
                        "kind" => "query",
                        "name" => "end",
                        "orig" => "end",
                        "reqd" => true,
                        "type" => "`$STRING`",
                      },
                      {
                        "kind" => "query",
                        "name" => "start",
                        "orig" => "start",
                        "reqd" => true,
                        "type" => "`$STRING`",
                      },
                      {
                        "kind" => "query",
                        "name" => "value",
                        "orig" => "value",
                        "reqd" => false,
                        "type" => "`$STRING`",
                      },
                      {
                        "kind" => "query",
                        "name" => "version",
                        "orig" => "version",
                        "reqd" => false,
                        "type" => "`$STRING`",
                      },
                    ],
                    "params" => [],
                  },
                  "method" => "GET",
                  "orig" => "/v2018/history",
                  "parts" => [
                    "v2018",
                    "history",
                  ],
                  "select" => {
                    "$action" => "history",
                    "exist" => [
                      "app",
                      "city",
                      "end",
                      "start",
                      "value",
                      "version",
                    ],
                  },
                  "transform" => {
                    "req" => "`reqdata`",
                    "res" => "`body`",
                  },
                  "active" => true,
                  "index$" => 0,
                },
                {
                  "args" => {
                    "query" => [
                      {
                        "kind" => "query",
                        "name" => "app",
                        "orig" => "app",
                        "reqd" => false,
                        "type" => "`$STRING`",
                      },
                      {
                        "kind" => "query",
                        "name" => "city",
                        "orig" => "city",
                        "reqd" => false,
                        "type" => "`$STRING`",
                      },
                      {
                        "kind" => "query",
                        "name" => "value",
                        "orig" => "value",
                        "reqd" => false,
                        "type" => "`$STRING`",
                      },
                      {
                        "kind" => "query",
                        "name" => "version",
                        "orig" => "version",
                        "reqd" => false,
                        "type" => "`$STRING`",
                      },
                    ],
                    "params" => [],
                  },
                  "method" => "GET",
                  "orig" => "/v2018/current",
                  "parts" => [
                    "v2018",
                    "current",
                  ],
                  "select" => {
                    "$action" => "current",
                    "exist" => [
                      "app",
                      "city",
                      "value",
                      "version",
                    ],
                  },
                  "transform" => {
                    "req" => "`reqdata`",
                    "res" => "`body`",
                  },
                  "active" => true,
                  "index$" => 1,
                },
                {
                  "args" => {
                    "query" => [
                      {
                        "kind" => "query",
                        "name" => "app",
                        "orig" => "app",
                        "reqd" => false,
                        "type" => "`$STRING`",
                      },
                      {
                        "kind" => "query",
                        "name" => "city",
                        "orig" => "city",
                        "reqd" => false,
                        "type" => "`$STRING`",
                      },
                      {
                        "kind" => "query",
                        "name" => "value",
                        "orig" => "value",
                        "reqd" => false,
                        "type" => "`$STRING`",
                      },
                      {
                        "kind" => "query",
                        "name" => "version",
                        "orig" => "version",
                        "reqd" => false,
                        "type" => "`$STRING`",
                      },
                    ],
                    "params" => [],
                  },
                  "method" => "GET",
                  "orig" => "/v2018/today",
                  "parts" => [
                    "v2018",
                    "today",
                  ],
                  "select" => {
                    "$action" => "today",
                    "exist" => [
                      "app",
                      "city",
                      "value",
                      "version",
                    ],
                  },
                  "transform" => {
                    "req" => "`reqdata`",
                    "res" => "`body`",
                  },
                  "active" => true,
                  "index$" => 2,
                },
                {
                  "args" => {
                    "query" => [
                      {
                        "kind" => "query",
                        "name" => "app",
                        "orig" => "app",
                        "reqd" => false,
                        "type" => "`$STRING`",
                      },
                      {
                        "kind" => "query",
                        "name" => "value",
                        "orig" => "value",
                        "reqd" => false,
                        "type" => "`$STRING`",
                      },
                      {
                        "kind" => "query",
                        "name" => "version",
                        "orig" => "version",
                        "reqd" => false,
                        "type" => "`$STRING`",
                      },
                    ],
                    "params" => [],
                  },
                  "method" => "GET",
                  "orig" => "/v2018/cities",
                  "parts" => [
                    "v2018",
                    "cities",
                  ],
                  "select" => {
                    "$action" => "city",
                    "exist" => [
                      "app",
                      "value",
                      "version",
                    ],
                  },
                  "transform" => {
                    "req" => "`reqdata`",
                    "res" => "`body`",
                  },
                  "active" => true,
                  "index$" => 3,
                },
                {
                  "args" => {
                    "query" => [
                      {
                        "kind" => "query",
                        "name" => "app",
                        "orig" => "app",
                        "reqd" => false,
                        "type" => "`$STRING`",
                      },
                      {
                        "kind" => "query",
                        "name" => "value",
                        "orig" => "value",
                        "reqd" => false,
                        "type" => "`$STRING`",
                      },
                      {
                        "kind" => "query",
                        "name" => "version",
                        "orig" => "version",
                        "reqd" => false,
                        "type" => "`$STRING`",
                      },
                    ],
                    "params" => [],
                  },
                  "method" => "GET",
                  "orig" => "/v2018/widget",
                  "parts" => [
                    "v2018",
                    "widget",
                  ],
                  "select" => {
                    "$action" => "widget",
                    "exist" => [
                      "app",
                      "value",
                      "version",
                    ],
                  },
                  "transform" => {
                    "req" => "`reqdata`",
                    "res" => "`body`",
                  },
                  "active" => true,
                  "index$" => 4,
                },
              ],
              "input" => "data",
              "key$" => "load",
            },
          },
          "relations" => {
            "ancestors" => [],
          },
        },
      },
    }
  end


  def self.make_feature(name)
    require_relative 'features'
    AareguruFeatures.make_feature(name)
  end
end
