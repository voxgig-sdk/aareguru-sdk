
import {
  depluralize,
} from '@voxgig/apidef'

import {
  Content,
  File,
  cmp,
  snakify,
} from '@voxgig/sdkgen'


function normalizePathParams(
  parts: string[],
  params: any[],
  rename?: Record<string, string>
): string {
  return parts.map((part: string) => {
    return part.replace(/\{([^}]+)\}/g, (match: string, rawName: string) => {
      const snaked = snakify(rawName)
      const depluralized = depluralize(snaked)
      // Prefer exact name match — orig matches can collide when one param's
      // original name was renamed to another param's current name (e.g. badge
      // load: param 'group_id' has orig 'id', and another param has name 'id').
      const param = params.find((p: any) =>
          p.name === snaked || p.name === depluralized) ||
        params.find((p: any) =>
          p.orig === snaked || p.orig === depluralized)
      if (param) return '{' + param.name + '}'

      if (rename) {
        for (const [origCamel, renamedTo] of Object.entries(rename)) {
          if (renamedTo === rawName) {
            const origSnaked = snakify(origCamel)
            const origDepluralized = depluralize(origSnaked)
            const renamedParam = params.find(
              (p: any) => p.orig === origSnaked || p.name === origSnaked ||
                p.orig === origDepluralized || p.name === origDepluralized
            )
            if (renamedParam) return '{' + renamedParam.name + '}'
          }
        }
      }

      return match
    })
  }).join('/')
}


const TestDirect = cmp(function TestDirect(props: any) {
  const ctx$ = props.ctx$
  const model = ctx$.model

  const target = props.target
  const entity = props.entity

  const PROJECTNAME = model.Name.toUpperCase().replace(/[^A-Z_]/g, '_')

  const opnames = Object.keys(entity.op)
  const hasLoad = opnames.includes('load')
  const hasList = opnames.includes('list')

  if (!hasLoad && !hasList) {
    return
  }

  const loadOp = entity.op.load
  const listOp = entity.op.list

  const loadPoint = loadOp?.points?.[0]
  const loadPath = loadPoint ? normalizePathParams(loadPoint.parts || [], loadPoint?.args?.params || [], loadPoint?.rename?.param) : ''
  const loadParams = loadPoint?.args?.params || []

  const listPoint = listOp?.points?.[0]
  const listPath = listPoint ? normalizePathParams(listPoint.parts || [], listPoint?.args?.params || [], listPoint?.rename?.param) : ''
  const listParams = listPoint?.args?.params || []

  const entidEnvVar = `${PROJECTNAME}_TEST_${entity.Name.toUpperCase().replace(/[^A-Z_]/g, '_')}_ENTID`

  File({ name: entity.Name + 'DirectTest.' + target.ext }, () => {

    Content(`<?php
declare(strict_types=1);

// ${entity.Name} direct test

require_once __DIR__ . '/../${model.const.Name.toLowerCase()}_sdk.php';
require_once __DIR__ . '/Runner.php';

use PHPUnit\\Framework\\TestCase;

class ${entity.Name}DirectTest extends TestCase
{
`)

    if (hasList && listPoint) {
      Content(`    public function test_direct_list_${entity.name}(): void
    {
        $setup = ${entity.name}_direct_setup([
            ["id" => "direct01"],
            ["id" => "direct02"],
        ]);
        $client = $setup["client"];

`)

      if (listParams.length > 0) {
        Content(`        $params = [];
`)
        for (const lp of listParams) {
          const key = lp.name === 'id'
            ? entity.name + '01'
            : lp.name.replace(/_id$/, '') + '01'
          Content(`        if ($setup["live"]) {
            $params["${lp.name}"] = $setup["idmap"]["${key}"];
        } else {
            $params["${lp.name}"] = "direct01";
        }
`)
        }
        Content(`
        [$result, $err] = $client->direct([
            "path" => "${listPath}",
            "method" => "GET",
            "params" => $params,
        ]);
`)
      } else {
        Content(`
        [$result, $err] = $client->direct([
            "path" => "${listPath}",
            "method" => "GET",
            "params" => [],
        ]);
`)
      }

      Content(`        $this->assertNull($err);
        $this->assertTrue($result["ok"]);
        $this->assertEquals(200, Helpers::to_int($result["status"]));

        if (!$setup["live"]) {
            $this->assertIsArray($result["data"]);
            $this->assertCount(2, $result["data"]);
            $this->assertCount(1, $setup["calls"]);
        }
    }

`)
    }

    if (hasLoad && loadPoint) {
      Content(`    public function test_direct_load_${entity.name}(): void
    {
        $setup = ${entity.name}_direct_setup(["id" => "direct01"]);
        $client = $setup["client"];

`)

      if (loadParams.length > 0) {
        Content(`        $params = [];
        if (!$setup["live"]) {
`)
        for (let i = 0; i < loadParams.length; i++) {
          Content(`            $params["${loadParams[i].name}"] = "direct0${i + 1}";
`)
        }
        Content(`        }
`)
      }

      Content(`
        [$result, $err] = $client->direct([
            "path" => "${loadPath}",
            "method" => "GET",
`)
      if (loadParams.length > 0) {
        Content(`            "params" => $params,
`)
      } else {
        Content(`            "params" => [],
`)
      }
      Content(`        ]);
        $this->assertNull($err);
        $this->assertTrue($result["ok"]);
        $this->assertEquals(200, Helpers::to_int($result["status"]));
        $this->assertNotNull($result["data"]);

        if (!$setup["live"]) {
            if (is_array($result["data"]) && isset($result["data"]["id"])) {
                $this->assertEquals("direct01", $result["data"]["id"]);
            }
            $this->assertCount(1, $setup["calls"]);
        }
    }

`)
    }

    Content(`}


function ${entity.name}_direct_setup($mockres)
{
    Runner::load_env_local();

    $calls = new \\ArrayObject();

    $env = Runner::env_override([
        "${entidEnvVar}" => [],
        "${PROJECTNAME}_TEST_LIVE" => "FALSE",
        "${PROJECTNAME}_APIKEY" => "NONE",
    ]);

    $live = $env["${PROJECTNAME}_TEST_LIVE"] === "TRUE";

    if ($live) {
        $merged_opts = [
            "apikey" => $env["${PROJECTNAME}_APIKEY"],
        ];
        $client = new ${model.const.Name}SDK($merged_opts);
        return [
            "client" => $client,
            "calls" => $calls,
            "live" => true,
            "idmap" => [],
        ];
    }

    $mock_fetch = function ($url, $init) use ($calls, $mockres) {
        $calls[] = ["url" => $url, "init" => $init];
        return [
            [
                "status" => 200,
                "statusText" => "OK",
                "headers" => [],
                "json" => function () use ($mockres) {
                    if ($mockres !== null) {
                        return $mockres;
                    }
                    return ["id" => "direct01"];
                },
                "body" => "mock",
            ],
            null,
        ];
    };

    $client = new ${model.const.Name}SDK([
        "base" => "http://localhost:8080",
        "system" => [
            "fetch" => $mock_fetch,
        ],
    ]);

    return [
        "client" => $client,
        "calls" => $calls,
        "live" => false,
        "idmap" => [],
    ];
}
`)
  })
})


export {
  TestDirect
}
