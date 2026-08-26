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
                "test" => [
          'options' => [
            'active' => false,
          ],
          'transport' => 'base',
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
                  'args' => [
                    'query' => [
                      [
                        'example' => 'my.app.ch',
                        'kind' => 'query',
                        'name' => 'app',
                        'orig' => 'app',
                        'type' => '`$STRING`',
                      ],
                      [
                        'example' => '1.0.42',
                        'kind' => 'query',
                        'name' => 'version',
                        'orig' => 'version',
                        'type' => '`$STRING`',
                      ],
                    ],
                  ],
                  'kind' => 'http',
                  'method' => 'GET',
                  'orig' => '/current',
                  'parts' => [
                    'current',
                  ],
                  'select' => [
                    'exist' => [
                      'app',
                      'version',
                    ],
                  ],
                  'transform' => [
                    'req' => '`reqdata`',
                    'res' => '`body`',
                  ],
                ],
                [
                  'args' => [
                    'query' => [
                      [
                        'example' => 'my.app.ch',
                        'kind' => 'query',
                        'name' => 'app',
                        'orig' => 'app',
                        'type' => '`$STRING`',
                      ],
                      [
                        'example' => '1.0.42',
                        'kind' => 'query',
                        'name' => 'version',
                        'orig' => 'version',
                        'type' => '`$STRING`',
                      ],
                    ],
                  ],
                  'kind' => 'http',
                  'method' => 'GET',
                  'orig' => '/currentV2',
                  'parts' => [
                    'currentV2',
                  ],
                  'select' => [
                    'exist' => [
                      'app',
                      'version',
                    ],
                  ],
                  'transform' => [
                    'req' => '`reqdata`',
                    'res' => '`body`',
                  ],
                ],
                [
                  'args' => [
                    'query' => [
                      [
                        'example' => 'my.app.ch',
                        'kind' => 'query',
                        'name' => 'app',
                        'orig' => 'app',
                        'type' => '`$STRING`',
                      ],
                      [
                        'example' => '1.0.42',
                        'kind' => 'query',
                        'name' => 'version',
                        'orig' => 'version',
                        'type' => '`$STRING`',
                      ],
                    ],
                  ],
                  'kind' => 'http',
                  'method' => 'GET',
                  'orig' => '/today',
                  'parts' => [
                    'today',
                  ],
                  'select' => [
                    'exist' => [
                      'app',
                      'version',
                    ],
                  ],
                  'transform' => [
                    'req' => '`reqdata`',
                    'res' => '`body`',
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
                  'args' => [
                    'query' => [
                      [
                        'example' => 'my.app.ch',
                        'kind' => 'query',
                        'name' => 'app',
                        'orig' => 'app',
                        'type' => '`$STRING`',
                      ],
                      [
                        'example' => 12,
                        'kind' => 'query',
                        'name' => 'line',
                        'orig' => 'line',
                        'type' => '`$INTEGER`',
                      ],
                      [
                        'example' => 'v2018_bueber',
                        'kind' => 'query',
                        'name' => 'service',
                        'orig' => 'service',
                        'reqd' => true,
                        'type' => '`$STRING`',
                      ],
                      [
                        'example' => '1.0.42',
                        'kind' => 'query',
                        'name' => 'version',
                        'orig' => 'version',
                        'type' => '`$STRING`',
                      ],
                    ],
                  ],
                  'kind' => 'http',
                  'method' => 'GET',
                  'orig' => '/logs',
                  'parts' => [
                    'logs',
                  ],
                  'select' => [
                    'exist' => [
                      'app',
                      'line',
                      'service',
                      'version',
                    ],
                  ],
                  'transform' => [
                    'req' => '`reqdata`',
                    'res' => '`body`',
                  ],
                ],
                [
                  'args' => [
                    'query' => [
                      [
                        'example' => 'my.app.ch',
                        'kind' => 'query',
                        'name' => 'app',
                        'orig' => 'app',
                        'type' => '`$STRING`',
                      ],
                      [
                        'example' => 'v2018_bueber',
                        'kind' => 'query',
                        'name' => 'service',
                        'orig' => 'service',
                        'reqd' => true,
                        'type' => '`$STRING`',
                      ],
                      [
                        'example' => '1.0.42',
                        'kind' => 'query',
                        'name' => 'version',
                        'orig' => 'version',
                        'type' => '`$STRING`',
                      ],
                    ],
                  ],
                  'kind' => 'http',
                  'method' => 'GET',
                  'orig' => '/rawdata',
                  'parts' => [
                    'rawdata',
                  ],
                  'select' => [
                    'exist' => [
                      'app',
                      'service',
                      'version',
                    ],
                  ],
                  'transform' => [
                    'req' => '`reqdata`',
                    'res' => '`body`',
                  ],
                ],
                [
                  'args' => [],
                  'kind' => 'http',
                  'method' => 'GET',
                  'orig' => '/slack',
                  'parts' => [
                    'slack',
                  ],
                  'select' => [],
                  'transform' => [
                    'req' => '`reqdata`',
                    'res' => '`body`',
                  ],
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
                  'args' => [
                    'query' => [
                      [
                        'example' => 'my.app.ch',
                        'kind' => 'query',
                        'name' => 'app',
                        'orig' => 'app',
                        'type' => '`$STRING`',
                      ],
                      [
                        'example' => 'bern',
                        'kind' => 'query',
                        'name' => 'city',
                        'orig' => 'city',
                        'reqd' => true,
                        'type' => '`$STRING`',
                      ],
                      [
                        'example' => '2025-02-13',
                        'kind' => 'query',
                        'name' => 'end',
                        'orig' => 'end',
                        'reqd' => true,
                        'type' => '`$STRING`',
                      ],
                      [
                        'example' => '2025-01-01',
                        'kind' => 'query',
                        'name' => 'start',
                        'orig' => 'start',
                        'reqd' => true,
                        'type' => '`$STRING`',
                      ],
                      [
                        'example' => null,
                        'kind' => 'query',
                        'name' => 'value',
                        'orig' => 'value',
                        'type' => '`$STRING`',
                      ],
                      [
                        'example' => '1.0.42',
                        'kind' => 'query',
                        'name' => 'version',
                        'orig' => 'version',
                        'type' => '`$STRING`',
                      ],
                    ],
                  ],
                  'kind' => 'http',
                  'method' => 'GET',
                  'orig' => '/v2018/history',
                  'parts' => [
                    'v2018',
                    'history',
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
                  'transform' => [
                    'req' => '`reqdata`',
                    'res' => '`body`',
                  ],
                ],
                [
                  'args' => [
                    'query' => [
                      [
                        'example' => 'my.app.ch',
                        'kind' => 'query',
                        'name' => 'app',
                        'orig' => 'app',
                        'type' => '`$STRING`',
                      ],
                      [
                        'example' => 'bern',
                        'kind' => 'query',
                        'name' => 'city',
                        'orig' => 'city',
                        'type' => '`$STRING`',
                      ],
                      [
                        'example' => null,
                        'kind' => 'query',
                        'name' => 'value',
                        'orig' => 'value',
                        'type' => '`$STRING`',
                      ],
                      [
                        'example' => '1.0.42',
                        'kind' => 'query',
                        'name' => 'version',
                        'orig' => 'version',
                        'type' => '`$STRING`',
                      ],
                    ],
                  ],
                  'kind' => 'http',
                  'method' => 'GET',
                  'orig' => '/v2018/current',
                  'parts' => [
                    'v2018',
                    'current',
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
                  'transform' => [
                    'req' => '`reqdata`',
                    'res' => '`body`',
                  ],
                ],
                [
                  'args' => [
                    'query' => [
                      [
                        'example' => 'my.app.ch',
                        'kind' => 'query',
                        'name' => 'app',
                        'orig' => 'app',
                        'type' => '`$STRING`',
                      ],
                      [
                        'example' => 'bern',
                        'kind' => 'query',
                        'name' => 'city',
                        'orig' => 'city',
                        'type' => '`$STRING`',
                      ],
                      [
                        'example' => null,
                        'kind' => 'query',
                        'name' => 'value',
                        'orig' => 'value',
                        'type' => '`$STRING`',
                      ],
                      [
                        'example' => '1.0.42',
                        'kind' => 'query',
                        'name' => 'version',
                        'orig' => 'version',
                        'type' => '`$STRING`',
                      ],
                    ],
                  ],
                  'kind' => 'http',
                  'method' => 'GET',
                  'orig' => '/v2018/today',
                  'parts' => [
                    'v2018',
                    'today',
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
                  'transform' => [
                    'req' => '`reqdata`',
                    'res' => '`body`',
                  ],
                ],
                [
                  'args' => [
                    'query' => [
                      [
                        'example' => 'my.app.ch',
                        'kind' => 'query',
                        'name' => 'app',
                        'orig' => 'app',
                        'type' => '`$STRING`',
                      ],
                      [
                        'example' => null,
                        'kind' => 'query',
                        'name' => 'value',
                        'orig' => 'value',
                        'type' => '`$STRING`',
                      ],
                      [
                        'example' => '1.0.42',
                        'kind' => 'query',
                        'name' => 'version',
                        'orig' => 'version',
                        'type' => '`$STRING`',
                      ],
                    ],
                  ],
                  'kind' => 'http',
                  'method' => 'GET',
                  'orig' => '/v2018/cities',
                  'parts' => [
                    'v2018',
                    'cities',
                  ],
                  'select' => [
                    '$action' => 'city',
                    'exist' => [
                      'app',
                      'value',
                      'version',
                    ],
                  ],
                  'transform' => [
                    'req' => '`reqdata`',
                    'res' => '`body`',
                  ],
                ],
                [
                  'args' => [
                    'query' => [
                      [
                        'example' => 'my.app.ch',
                        'kind' => 'query',
                        'name' => 'app',
                        'orig' => 'app',
                        'type' => '`$STRING`',
                      ],
                      [
                        'example' => null,
                        'kind' => 'query',
                        'name' => 'value',
                        'orig' => 'value',
                        'type' => '`$STRING`',
                      ],
                      [
                        'example' => '1.0.42',
                        'kind' => 'query',
                        'name' => 'version',
                        'orig' => 'version',
                        'type' => '`$STRING`',
                      ],
                    ],
                  ],
                  'kind' => 'http',
                  'method' => 'GET',
                  'orig' => '/v2018/widget',
                  'parts' => [
                    'v2018',
                    'widget',
                  ],
                  'select' => [
                    '$action' => 'widget',
                    'exist' => [
                      'app',
                      'value',
                      'version',
                    ],
                  ],
                  'transform' => [
                    'req' => '`reqdata`',
                    'res' => '`body`',
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
