
import {
  Model,
  ModelEntity,
  nom,
  depluralize,
} from '@voxgig/apidef'

import {
  Content,
  File,
  cmp,
  snakify,
  isAuthActive,
  serverVarEnv,
  serverVariables, envName, envToken,
  pointParts,
  pointPlaceholders,
  liveStrict,
  liveStrictNote,
  pointIsGraphql,
  graphqlDirectSkip,
  liveExampleIds,
  liveQueryExamples,
  liveEntity,
  liveDirectGetOnly, liveExcludedLines, liveExcludedSummary, LIVE_GETONLY_ENV,
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
          p.n === snaked || p.n === depluralized) ||
        params.find((p: any) =>
          p.or === snaked || p.or === depluralized)
      if (param) return '{' + param.n + '}'

      if (rename) {
        for (const [origCamel, renamedTo] of Object.entries(rename)) {
          if (renamedTo === rawName) {
            const origSnaked = snakify(origCamel)
            const origDepluralized = depluralize(origSnaked)
            const renamedParam = params.find(
              (p: any) => p.or === origSnaked || p.n === origSnaked ||
                p.or === origDepluralized || p.n === origDepluralized
            )
            if (renamedParam) return '{' + renamedParam.n + '}'
          }
        }
      }

      return match
    })
  }).join('/')
}


// Blocked without the ids its request needs, rather than sent with None.
// A GET-only live run excludes a test needing an id that only a write gives.
function getOnlyKeysBlock(model: any, entity: any, test: string, keys: string[]): string {
  return liveDirectGetOnly(model, entity, test, keys).map((miss) =>
    `        if setup["live"] and os.environ.get(${JSON.stringify(LIVE_GETONLY_ENV)}) == "TRUE" and setup["idmap"].get(${JSON.stringify(miss.key)}) is None:
            print(${JSON.stringify(liveExcludedLines({ excluded: [miss] })[0])})
            pytest.skip(${JSON.stringify(liveExcludedSummary({ excluded: [miss] }))})

`).join('')
}


function liveKeysBlock(keys: string[], entidEnvVar: string): string {
  return 0 === keys.length ? '' : `        if setup["live"]:
            for _live_key in [${keys.map((k) => JSON.stringify(k)).join(', ')}]:
                if setup["idmap"].get(_live_key) is None:
                    runner.live_miss(LIVE_STRICT, f"Live test blocked: needs {_live_key} via ${entidEnvVar}")

`
}


const TestDirect = cmp(function TestDirect(props: any) {
  const ctx$ = props.ctx$
  const model: Model = ctx$.model

  const target = props.target
  const entity: ModelEntity = liveEntity(ctx$, props.entity)

  const PROJECTNAME = envName(model)

  const authActive = isAuthActive(model)
  const apikeyEnvEntry = authActive
    ? `\n        "${PROJECTNAME}_APIKEY": "",`
    : ''
  const apikeyLiveField = authActive
    ? `\n            "apikey": env.get("${PROJECTNAME}_APIKEY"),`
    : ''

  // A templated server URL (OpenAPI server variables) makes a LIVE client
  // impossible to construct without values: make_options raises rather than
  // request a URL with a literal `{account_id}` in it. Taken from the
  // environment, the same way the apikey is.
  const svars = serverVariables(model)
  const serverEnvEntry = svars
    .map((v: any) => `\n        "${serverVarEnv(PROJECTNAME, v.name)}": ${JSON.stringify(v.dflt)},`).join('')
  const serverLiveField = 0 === svars.length ? '' :
    `\n            "server": {` +
    svars.map((v: any) =>
      `\n                "${v.name}": env.get("${serverVarEnv(PROJECTNAME, v.name)}"),`).join('') +
    `\n            },`


  const opnames = Object.keys(entity.op || {})
  const hasLoad = opnames.includes('load')
  const hasList = opnames.includes('list')

  if (!hasLoad && !hasList) {
    return
  }

  const loadOp = entity.op?.load
  const listOp = entity.op?.list

  const loadPoint = loadOp?.points?.[0]
  const loadPath = loadPoint ? normalizePathParams(pointParts(loadPoint), loadPoint?.g?.params || [], loadPoint?.r?.param) : ''
  const allLoadParams = loadPoint?.g?.params || []
  // Some upstream OpenAPI specs declare a parameter as `in: path` even when
  // that path has no `{name}` placeholder for it. Only path params that
  // actually appear in the URL template should drive direct-test path-param
  // setup and URL-substitution asserts; otherwise the SDK silently drops
  // them and the URL-includes assert fails.
  const _pathPlaceholders = new Set<string>(pointPlaceholders(loadPoint))
  const _renameMap = (loadPoint?.r?.param || {}) as Record<string, string>
  const _renamedPlaceholders = new Set<string>()
  for (const ph of _pathPlaceholders) {
    _renamedPlaceholders.add(ph)
    for (const [orig, renamed] of Object.entries(_renameMap)) {
      if (renamed === ph) _renamedPlaceholders.add(orig)
    }
  }
  const loadParams = allLoadParams.filter((p: any) =>
    _renamedPlaceholders.has(p.n) || _renamedPlaceholders.has(p.or))

  const listPoint = listOp?.points?.[0]
  const listPath = listPoint ? normalizePathParams(pointParts(listPoint), listPoint?.g?.params || [], listPoint?.r?.param) : ''
  const listParams = listPoint?.g?.params || []

  const loadLiveQueryLines = liveQueryExamples(loadPoint)
    .map(([name, ex]) => `            query["${name}"] = ${pyLit(ex)}`)
    .join('\n')

  // Path params with spec-provided examples — when ALL load params have
  // spec examples, prefer them over list-bootstrap.
  const loadAllHaveExamples =
    loadParams.length > 0 &&
    loadParams.every((p: any) => undefined !== p.ex && null !== p.ex)
  const loadExampleLines = loadAllHaveExamples
    ? loadParams.map((p: any) => `            params["${p.n}"] = ${JSON.stringify(p.ex)}`).join('\n')
    : ''

  const entidEnvVar = `${PROJECTNAME}_TEST_${envToken(entity.name)}_ENTID`

  const exampleIds = liveExampleIds(entity)
  const listLiveQueryLines = liveQueryExamples(listPoint)
    .map(([name, ex]) => `            query["${name}"] = ${pyLit(ex)}\n`).join('')

  // The *_ENTID key a live test reads a parameter's value from.
  const liveKey = (param: any): string =>
    ('id' === param.n ? entity.name : param.n.replace(/_id$/, '')) + '01'

  File({ name: 'test_' + entity.name + '_direct.' + target.ext }, () => {

    Content(`# ${entity.Name} direct test

import json
import os
import pytest

from ${model.const.Name.toLowerCase()}_sdk.utility.voxgig_struct import voxgig_struct as vs
from ${model.const.Name.toLowerCase()}_sdk import ${model.const.Name}SDK
from ${model.const.Name.toLowerCase()}_sdk.core import helpers
from test import runner


${liveStrictNote(liveStrict(model, target.name), '#')}
LIVE_STRICT = ${liveStrict(model, target.name) ? 'True' : 'False'}


def _live_ok(result):
    status = helpers.to_int(result.get("status"))
    return result.get("err") is None and bool(result.get("ok")) and 200 <= status < 300


class Test${entity.Name}Direct:

`)

    if (hasList && pointIsGraphql(listPoint)) {
      Content(`    def test_should_direct_list_${entity.name}(self):
        pytest.skip("${graphqlDirectSkip('list', entity.name)}")

`)
    }
    else if (hasList && listPoint) {
      const listLiveIdKeys: string[] = listParams.map(liveKey)
      Content(`    def test_should_direct_list_${entity.name}(self):
        setup = _${entity.name}_direct_setup([
            {"id": "direct01"},
            {"id": "direct02"},
        ])
        _skip, _reason = runner.is_control_skipped("direct", "direct-list-${entity.name}", "live" if setup["live"] else "unit")
        if _skip:
            pytest.skip(_reason or "skipped via sdk-test-control.json")
            return
${getOnlyKeysBlock(model, entity, 'direct-list-' + entity.name, listLiveIdKeys)}${liveKeysBlock(listLiveIdKeys, entidEnvVar)}        client = setup["client"]

        params = {}
        query = {}
${listLiveQueryLines ? '        if setup["live"]:\n' + listLiveQueryLines : ''}`)
      listParams.forEach((lp: any, i: number) => {
        Content(`        if setup["live"]:
            params["${lp.n}"] = setup["idmap"].get("${liveKey(lp)}")
        else:
            params["${lp.n}"] = "direct0${i + 1}"
`)
      })
      Content(`
        result = client.direct({
            "path": "${listPath}",
            "method": "GET",
            "params": params,
            "query": query,
        })
        if setup["live"]:
            if not _live_ok(result):
                runner.live_miss(LIVE_STRICT, "Live list failed: " + runner.live_describe(result))
            if runner.live_list(result.get("data")) is None:
                runner.live_miss(LIVE_STRICT, "Live list returned no list: " + runner.live_describe(result))
        else:
            assert result["ok"] is True
            assert helpers.to_int(result["status"]) == 200
            assert isinstance(result["data"], list)
            assert len(result["data"]) == 2
            assert len(setup["calls"]) == 1

`)
    }

    if (hasLoad && pointIsGraphql(loadPoint)) {
      Content(`    def test_should_direct_load_${entity.name}(self):
        pytest.skip("${graphqlDirectSkip('load', entity.name)}")

`)
    }
    else if (hasLoad && loadPoint) {
      const discover = !loadAllHaveExamples && hasList && 0 < loadParams.length
      const idParam = loadParams.find((p: any) => 'id' === p.n)?.n ?? loadParams[0]?.n ?? 'id'
      const loadLiveIdKeys: string[] = loadAllHaveExamples ? [] :
        discover ? listParams.map(liveKey).concat(loadParams.filter((p: any) => idParam !== p.n).map(liveKey)) :
          loadParams.map(liveKey)
      Content(`    def test_should_direct_load_${entity.name}(self):
        setup = _${entity.name}_direct_setup({"id": "direct01"})
        _skip, _reason = runner.is_control_skipped("direct", "direct-load-${entity.name}", "live" if setup["live"] else "unit")
        if _skip:
            pytest.skip(_reason or "skipped via sdk-test-control.json")
            return
${getOnlyKeysBlock(model, entity, 'direct-load-' + entity.name, [...new Set(loadLiveIdKeys)])}${liveKeysBlock([...new Set(loadLiveIdKeys)], entidEnvVar)}        client = setup["client"]

        params = {}
        query = {}
        if setup["live"]:
${loadLiveQueryLines ? loadLiveQueryLines + '\n' : ''}`)
      if (loadAllHaveExamples) {
        Content(loadExampleLines + '\n')
      }
      else if (discover) {
        Content(`            list_result = client.direct({
                "path": "${listPath}",
                "method": "GET",
                "params": {${listParams.map((p: any) => `"${p.n}": setup["idmap"].get("${liveKey(p)}")`).join(', ')}},
            })
            if not _live_ok(list_result):
                runner.live_miss(LIVE_STRICT, "Live list discovery failed: " + runner.live_describe(list_result))
            records = runner.live_list(list_result.get("data"))
            if records is None:
                runner.live_miss(LIVE_STRICT, "Live list discovery returned no list: " + runner.live_describe(list_result))
            if 0 == len(records):
                runner.live_empty("The account has no ${entity.name} record to load")
            first = records[0] if isinstance(records[0], dict) else {}
            if first.get("${idParam}", first.get("id")) is None:
                runner.live_miss(LIVE_STRICT, "Live load blocked: discovery returned no usable identity")
            params["${idParam}"] = first.get("${idParam}", first.get("id"))
`)
        for (const p of loadParams.filter((p: any) => idParam !== p.n)) {
          Content(`            params["${p.n}"] = setup["idmap"].get("${liveKey(p)}")
`)
        }
      }
      else {
        for (const p of loadParams) {
          Content(`            params["${p.n}"] = setup["idmap"].get("${liveKey(p)}")
`)
        }
      }
      Content(`            pass
        else:
`)
      for (let i = 0; i < loadParams.length; i++) {
        Content(`            params["${loadParams[i].n}"] = "direct0${i + 1}"
`)
      }
      Content(`            pass

        result = client.direct({
            "path": "${loadPath}",
            "method": "GET",
            "params": params,
            "query": query,
        })
        if setup["live"]:
            if not _live_ok(result):
                runner.live_miss(LIVE_STRICT, "Live load failed: " + runner.live_describe(result))
            if result.get("data") is None:
                runner.live_miss(LIVE_STRICT, "Live load returned no data: " + runner.live_describe(result))
        else:
            assert result["ok"] is True
            assert helpers.to_int(result["status"]) == 200
            assert result["data"] is not None
            if isinstance(result["data"], dict):
                assert result["data"]["id"] == "direct01"
            assert len(setup["calls"]) == 1

`)
    }

    Content(`

def _${entity.name}_direct_setup(mockres):
    runner.load_env_local()

    calls = []

    env = runner.env_override({
        "${entidEnvVar}": {},
        "${PROJECTNAME}_TEST_LIVE": "FALSE",${apikeyEnvEntry}${serverEnvEntry}
    })

    live = env.get("${PROJECTNAME}_TEST_LIVE") == "TRUE"

    if live:
        # sdk-test-control.json's test.client.options seeds the live
        # client; the generated fields below overwrite anything they name.
        merged_opts = dict(runner.live_client_options())
        merged_opts.update({${apikeyLiveField}${serverLiveField}
        })
        client = ${model.const.Name}SDK(merged_opts)
        idmap = env.get("${entidEnvVar}")
${0 === exampleIds.length ? '' : `        # A path parameter's example stands in for an id *_ENTID does not give.
        idmap = {${exampleIds.map(([key, ex]) => `${JSON.stringify(key)}: ${pyLit(ex)}`).join(', ')},
                 **(idmap if isinstance(idmap, dict) else {})}
`}        return {
            "client": client,
            "calls": calls,
            "live": True,
            "idmap": idmap if isinstance(idmap, dict) else {},
        }

    def mock_fetch(url, init):
        calls.append({"url": url, "init": init})
        return {
            "status": 200,
            "statusText": "OK",
            "headers": {},
            "json": lambda: mockres if mockres is not None else {"id": "direct01"},
            "body": "mock",
        }, None

    client = ${model.const.Name}SDK({
        "base": "http://localhost:8080",
        "system": {
            "fetch": mock_fetch,
        },
    })

    return {
        "client": client,
        "calls": calls,
        "live": False,
        "idmap": {},
    }
`)
  })
})


function pyLit(value: any): string {
  return true === value ? 'True' : false === value ? 'False' : JSON.stringify(value)
}


export {
  TestDirect
}
