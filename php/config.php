<?php
declare(strict_types=1);

// Aareguru SDK configuration

class AareguruConfig
{
    /** @var array<string,mixed>|null */
    private static ?array $shared_config = null;

    /**
     * Return the process-wide config, built once on first use. The SDK reads
     * the config on every request and never writes to it, so one instance is
     * shared by every client rather than rebuilt per client.
     *
     * PHP arrays are copy-on-write, so callers that do mutate the result get
     * their own copy and cannot disturb the shared one.
     */
    public static function shared_config(): array
    {
        if (self::$shared_config === null) {
            self::$shared_config = self::make_config();
        }
        return self::$shared_config;
    }

    /**
     * Build a fresh, fully materialised config array. Every call rebuilds the
     * whole structure, so prefer shared_config unless you need a private copy.
     */
    public static function make_config(): array
    {
        return [
            "main" => [
                "name" => "Aareguru",
                "slug" => "aareguru",
                "version" => "0.0.1",
                "target" => "php",
            ],
            "feature" => [
                "ratelimit" => [
          'options' => [
            'active' => false,
            'burst' => 5,
            'rate' => 5,
          ],
          'optspec' => [
            'now' => '`$FUNCTION`',
            'sleep' => '`$FUNCTION`',
          ],
          'strict' => false,
          'transport' => 'wrap',
        ],
                "retry" => [
          'options' => [
            'active' => false,
            'factor' => 2,
            'maxDelay' => 2000,
            'minDelay' => 50,
            'retries' => 2,
            'statuses' => [
              408,
              425,
              429,
              500,
              502,
              503,
              504,
            ],
          ],
          'optspec' => [
            'jitter' => '`$BOOLEAN`',
            'sleep' => '`$FUNCTION`',
          ],
          'strict' => false,
          'transport' => 'wrap',
        ],
                "test" => [
          'options' => [
            'active' => false,
          ],
          'optspec' => [
            'entity' => '`$MAP`',
            'net' => '`$MAP`',
          ],
          'strict' => false,
          'transport' => 'base',
        ],
                "timeout" => [
          'options' => [
            'active' => false,
            'ms' => 30000,
          ],
          'optspec' => [
            'clearTimer' => '`$FUNCTION`',
            'setTimer' => '`$FUNCTION`',
          ],
          'strict' => false,
          'transport' => 'wrap',
        ],
            ],
            "options" => [
                "base" => "https://aareguru.existenz.ch",
                "headers" => [
          'content-type' => 'application/json',
        ],
                "entity" => [
                    "legacy" => [],
                    "stuff" => [],
                    "v2018" => [],
                ],
            ],
            "entity" => [
        'legacy' => [
          'fields' => [],
          'name' => 'legacy',
          'op' => [
            'load' => [
              'input' => 'data',
              'name' => 'load',
              'points' => [
                [
                  'kind' => 'http',
                  'method' => 'GET',
                  'orig' => '/current',
                  'segments' => [
                    [
                      'lit' => 'current',
                    ],
                  ],
                  'parts' => [
                    'current',
                  ],
                  'rename' => [],
                  'transform' => [
                    'req' => '`reqdata`',
                    'res' => '`body`',
                  ],
                  'args' => [
                    'query' => [
                      [
                        'name' => 'app',
                        'orig' => 'app',
                        'type' => '`$STRING`',
                        'kind' => 'query',
                        'example' => 'my.app.ch',
                      ],
                      [
                        'name' => 'version',
                        'orig' => 'version',
                        'type' => '`$STRING`',
                        'kind' => 'query',
                        'example' => '1.0.42',
                      ],
                    ],
                  ],
                  'select' => [
                    'exist' => [
                      'app',
                      'version',
                    ],
                  ],
                ],
                [
                  'kind' => 'http',
                  'method' => 'GET',
                  'orig' => '/currentV2',
                  'segments' => [
                    [
                      'lit' => 'currentV2',
                    ],
                  ],
                  'parts' => [
                    'currentV2',
                  ],
                  'rename' => [],
                  'transform' => [
                    'req' => '`reqdata`',
                    'res' => '`body`',
                  ],
                  'args' => [
                    'query' => [
                      [
                        'name' => 'app',
                        'orig' => 'app',
                        'type' => '`$STRING`',
                        'kind' => 'query',
                        'example' => 'my.app.ch',
                      ],
                      [
                        'name' => 'version',
                        'orig' => 'version',
                        'type' => '`$STRING`',
                        'kind' => 'query',
                        'example' => '1.0.42',
                      ],
                    ],
                  ],
                  'select' => [
                    'exist' => [
                      'app',
                      'version',
                    ],
                  ],
                ],
                [
                  'kind' => 'http',
                  'method' => 'GET',
                  'orig' => '/today',
                  'segments' => [
                    [
                      'lit' => 'today',
                    ],
                  ],
                  'parts' => [
                    'today',
                  ],
                  'rename' => [],
                  'transform' => [
                    'req' => '`reqdata`',
                    'res' => '`body`',
                  ],
                  'args' => [
                    'query' => [
                      [
                        'name' => 'app',
                        'orig' => 'app',
                        'type' => '`$STRING`',
                        'kind' => 'query',
                        'example' => 'my.app.ch',
                      ],
                      [
                        'name' => 'version',
                        'orig' => 'version',
                        'type' => '`$STRING`',
                        'kind' => 'query',
                        'example' => '1.0.42',
                      ],
                    ],
                  ],
                  'select' => [
                    'exist' => [
                      'app',
                      'version',
                    ],
                  ],
                ],
              ],
            ],
          ],
          'relations' => [
            'ancestors' => [],
          ],
        ],
        'stuff' => [
          'fields' => [],
          'name' => 'stuff',
          'op' => [
            'load' => [
              'input' => 'data',
              'name' => 'load',
              'points' => [
                [
                  'kind' => 'http',
                  'method' => 'GET',
                  'orig' => '/logs',
                  'segments' => [
                    [
                      'lit' => 'logs',
                    ],
                  ],
                  'parts' => [
                    'logs',
                  ],
                  'rename' => [],
                  'transform' => [
                    'req' => '`reqdata`',
                    'res' => '`body`',
                  ],
                  'args' => [
                    'query' => [
                      [
                        'name' => 'app',
                        'orig' => 'app',
                        'type' => '`$STRING`',
                        'kind' => 'query',
                        'example' => 'my.app.ch',
                      ],
                      [
                        'name' => 'line',
                        'orig' => 'line',
                        'type' => '`$INTEGER`',
                        'kind' => 'query',
                        'example' => 12,
                      ],
                      [
                        'name' => 'service',
                        'orig' => 'service',
                        'type' => '`$STRING`',
                        'kind' => 'query',
                        'reqd' => true,
                        'example' => 'v2018_bueber',
                      ],
                      [
                        'name' => 'version',
                        'orig' => 'version',
                        'type' => '`$STRING`',
                        'kind' => 'query',
                        'example' => '1.0.42',
                      ],
                    ],
                  ],
                  'select' => [
                    'exist' => [
                      'app',
                      'line',
                      'service',
                      'version',
                    ],
                  ],
                ],
                [
                  'kind' => 'http',
                  'method' => 'GET',
                  'orig' => '/rawdata',
                  'segments' => [
                    [
                      'lit' => 'rawdata',
                    ],
                  ],
                  'parts' => [
                    'rawdata',
                  ],
                  'rename' => [],
                  'transform' => [
                    'req' => '`reqdata`',
                    'res' => '`body`',
                  ],
                  'args' => [
                    'query' => [
                      [
                        'name' => 'app',
                        'orig' => 'app',
                        'type' => '`$STRING`',
                        'kind' => 'query',
                        'example' => 'my.app.ch',
                      ],
                      [
                        'name' => 'service',
                        'orig' => 'service',
                        'type' => '`$STRING`',
                        'kind' => 'query',
                        'reqd' => true,
                        'example' => 'v2018_bueber',
                      ],
                      [
                        'name' => 'version',
                        'orig' => 'version',
                        'type' => '`$STRING`',
                        'kind' => 'query',
                        'example' => '1.0.42',
                      ],
                    ],
                  ],
                  'select' => [
                    'exist' => [
                      'app',
                      'service',
                      'version',
                    ],
                  ],
                ],
                [
                  'kind' => 'http',
                  'method' => 'GET',
                  'orig' => '/slack',
                  'segments' => [
                    [
                      'lit' => 'slack',
                    ],
                  ],
                  'parts' => [
                    'slack',
                  ],
                  'rename' => [],
                  'transform' => [
                    'req' => '`reqdata`',
                    'res' => '`body`',
                  ],
                  'args' => [],
                  'select' => [],
                ],
              ],
            ],
          ],
          'relations' => [
            'ancestors' => [],
          ],
        ],
        'v2018' => [
          'fields' => [],
          'name' => 'v2018',
          'op' => [
            'load' => [
              'input' => 'data',
              'name' => 'load',
              'points' => [
                [
                  'kind' => 'http',
                  'method' => 'GET',
                  'orig' => '/v2018/history',
                  'segments' => [
                    [
                      'lit' => 'v2018',
                    ],
                    [
                      'lit' => 'history',
                    ],
                  ],
                  'parts' => [
                    'v2018',
                    'history',
                  ],
                  'rename' => [],
                  'transform' => [
                    'req' => '`reqdata`',
                    'res' => '`body`',
                  ],
                  'args' => [
                    'query' => [
                      [
                        'name' => 'app',
                        'orig' => 'app',
                        'type' => '`$STRING`',
                        'kind' => 'query',
                        'example' => 'my.app.ch',
                      ],
                      [
                        'name' => 'city',
                        'orig' => 'city',
                        'type' => '`$STRING`',
                        'kind' => 'query',
                        'reqd' => true,
                        'example' => 'bern',
                      ],
                      [
                        'name' => 'end',
                        'orig' => 'end',
                        'type' => '`$STRING`',
                        'kind' => 'query',
                        'reqd' => true,
                        'example' => '2025-02-13',
                      ],
                      [
                        'name' => 'start',
                        'orig' => 'start',
                        'type' => '`$STRING`',
                        'kind' => 'query',
                        'reqd' => true,
                        'example' => '2025-01-01',
                      ],
                      [
                        'name' => 'value',
                        'orig' => 'value',
                        'type' => '`$STRING`',
                        'kind' => 'query',
                        'example' => null,
                      ],
                      [
                        'name' => 'version',
                        'orig' => 'version',
                        'type' => '`$STRING`',
                        'kind' => 'query',
                        'example' => '1.0.42',
                      ],
                    ],
                  ],
                  'select' => [
                    '$action' => 'history',
                    'exist' => [
                      'app',
                      'city',
                      'end',
                      'start',
                      'value',
                      'version',
                    ],
                  ],
                ],
                [
                  'kind' => 'http',
                  'method' => 'GET',
                  'orig' => '/v2018/current',
                  'segments' => [
                    [
                      'lit' => 'v2018',
                    ],
                    [
                      'lit' => 'current',
                    ],
                  ],
                  'parts' => [
                    'v2018',
                    'current',
                  ],
                  'rename' => [],
                  'transform' => [
                    'req' => '`reqdata`',
                    'res' => '`body`',
                  ],
                  'args' => [
                    'query' => [
                      [
                        'name' => 'app',
                        'orig' => 'app',
                        'type' => '`$STRING`',
                        'kind' => 'query',
                        'example' => 'my.app.ch',
                      ],
                      [
                        'name' => 'city',
                        'orig' => 'city',
                        'type' => '`$STRING`',
                        'kind' => 'query',
                        'example' => 'bern',
                      ],
                      [
                        'name' => 'value',
                        'orig' => 'value',
                        'type' => '`$STRING`',
                        'kind' => 'query',
                        'example' => null,
                      ],
                      [
                        'name' => 'version',
                        'orig' => 'version',
                        'type' => '`$STRING`',
                        'kind' => 'query',
                        'example' => '1.0.42',
                      ],
                    ],
                  ],
                  'select' => [
                    '$action' => 'current',
                    'exist' => [
                      'app',
                      'city',
                      'value',
                      'version',
                    ],
                  ],
                ],
                [
                  'kind' => 'http',
                  'method' => 'GET',
                  'orig' => '/v2018/today',
                  'segments' => [
                    [
                      'lit' => 'v2018',
                    ],
                    [
                      'lit' => 'today',
                    ],
                  ],
                  'parts' => [
                    'v2018',
                    'today',
                  ],
                  'rename' => [],
                  'transform' => [
                    'req' => '`reqdata`',
                    'res' => '`body`',
                  ],
                  'args' => [
                    'query' => [
                      [
                        'name' => 'app',
                        'orig' => 'app',
                        'type' => '`$STRING`',
                        'kind' => 'query',
                        'example' => 'my.app.ch',
                      ],
                      [
                        'name' => 'city',
                        'orig' => 'city',
                        'type' => '`$STRING`',
                        'kind' => 'query',
                        'example' => 'bern',
                      ],
                      [
                        'name' => 'value',
                        'orig' => 'value',
                        'type' => '`$STRING`',
                        'kind' => 'query',
                        'example' => null,
                      ],
                      [
                        'name' => 'version',
                        'orig' => 'version',
                        'type' => '`$STRING`',
                        'kind' => 'query',
                        'example' => '1.0.42',
                      ],
                    ],
                  ],
                  'select' => [
                    '$action' => 'today',
                    'exist' => [
                      'app',
                      'city',
                      'value',
                      'version',
                    ],
                  ],
                ],
                [
                  'kind' => 'http',
                  'method' => 'GET',
                  'orig' => '/v2018/cities',
                  'segments' => [
                    [
                      'lit' => 'v2018',
                    ],
                    [
                      'lit' => 'cities',
                    ],
                  ],
                  'parts' => [
                    'v2018',
                    'cities',
                  ],
                  'rename' => [],
                  'transform' => [
                    'req' => '`reqdata`',
                    'res' => '`body`',
                  ],
                  'args' => [
                    'query' => [
                      [
                        'name' => 'app',
                        'orig' => 'app',
                        'type' => '`$STRING`',
                        'kind' => 'query',
                        'example' => 'my.app.ch',
                      ],
                      [
                        'name' => 'value',
                        'orig' => 'value',
                        'type' => '`$STRING`',
                        'kind' => 'query',
                        'example' => null,
                      ],
                      [
                        'name' => 'version',
                        'orig' => 'version',
                        'type' => '`$STRING`',
                        'kind' => 'query',
                        'example' => '1.0.42',
                      ],
                    ],
                  ],
                  'select' => [
                    '$action' => 'city',
                    'exist' => [
                      'app',
                      'value',
                      'version',
                    ],
                  ],
                ],
                [
                  'kind' => 'http',
                  'method' => 'GET',
                  'orig' => '/v2018/widget',
                  'segments' => [
                    [
                      'lit' => 'v2018',
                    ],
                    [
                      'lit' => 'widget',
                    ],
                  ],
                  'parts' => [
                    'v2018',
                    'widget',
                  ],
                  'rename' => [],
                  'transform' => [
                    'req' => '`reqdata`',
                    'res' => '`body`',
                  ],
                  'args' => [
                    'query' => [
                      [
                        'name' => 'app',
                        'orig' => 'app',
                        'type' => '`$STRING`',
                        'kind' => 'query',
                        'example' => 'my.app.ch',
                      ],
                      [
                        'name' => 'value',
                        'orig' => 'value',
                        'type' => '`$STRING`',
                        'kind' => 'query',
                        'example' => null,
                      ],
                      [
                        'name' => 'version',
                        'orig' => 'version',
                        'type' => '`$STRING`',
                        'kind' => 'query',
                        'example' => '1.0.42',
                      ],
                    ],
                  ],
                  'select' => [
                    '$action' => 'widget',
                    'exist' => [
                      'app',
                      'value',
                      'version',
                    ],
                  ],
                ],
              ],
            ],
          ],
          'relations' => [
            'ancestors' => [],
          ],
        ],
      ],
        ];
    }


    public static function make_feature(string $name)
    {
        require_once __DIR__ . '/features.php';
        return AareguruFeatures::make_feature($name);
    }
}
