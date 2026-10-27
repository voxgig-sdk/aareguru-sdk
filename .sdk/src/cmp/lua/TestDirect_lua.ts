
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
  isAuthActive, envName, envToken,
  serverVarEnv,
  serverVariables,
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

import { formatLuaValue } from './utility_lua'


// Blocked without the ids its request needs, rather than sent with nil.
// A GET-only live run excludes a test needing an id that only a write gives.
function getOnlyKeysBlock(model: any, entity: any, test: string, keys: string[]): string {
  return liveDirectGetOnly(model, entity, test, keys).map((miss) =>
    `    if setup.live and os.getenv(${formatLuaValue(LIVE_GETONLY_ENV)}) == "TRUE" and setup.idmap[${formatLuaValue(miss.key)}] == nil then
      print(${formatLuaValue(liveExcludedLines({ excluded: [miss] })[0])})
      pending(${formatLuaValue(liveExcludedSummary({ excluded: [miss] }))})
      return
    end
`).join('')
}


function liveKeysBlock(keys: string[], entidEnvVar: string): string {
  return 0 === keys.length ? '' : `    if setup.live then
      for _, _live_key in ipairs({${keys.map((k) => JSON.stringify(k)).join(', ')}}) do
        if setup.idmap[_live_key] == nil then
          runner.live_miss(pending, LIVE_STRICT, "Live test blocked: needs " .. _live_key .. " via ${entidEnvVar}")
        end
      end
    end
`
}


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


const TestDirect = cmp(function TestDirect(props: any) {
  const ctx$ = props.ctx$
  const model: Model = ctx$.model

  const target = props.target
  const entity: ModelEntity = liveEntity(ctx$, props.entity)

  const PROJECTNAME = envName(model)

  const authActive = isAuthActive(model)
  const apikeyEnvEntry = authActive
    ? `\n    ["${PROJECTNAME}_APIKEY"] = "",`
    : ''
  const apikeyLiveField = authActive
    ? `\n      apikey = env["${PROJECTNAME}_APIKEY"],`
    : ''

  // A templated server URL (OpenAPI server variables) makes a LIVE client
  // impossible to construct without values: makeOptions raises rather than
  // request a URL with a literal `{account_id}` in it. So the live suite
  // takes them from the environment the same way it takes the apikey.
  const svars = serverVariables(model)
  const serverEnvEntry = svars
    .map((v: any) => `\n    ["${serverVarEnv(PROJECTNAME, v.name)}"] = ${formatLuaValue(v.dflt)},`).join('')
  const serverLiveField = 0 === svars.length ? '' : `
      server = {${svars
      .map((v: any) => `
        ["${v.name}"] = env["${serverVarEnv(PROJECTNAME, v.name)}"],`).join('')}
      },`

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

  // Required query params with spec-provided examples — needed in live mode.
  const loadLiveQueryLines = liveQueryExamples(loadPoint)
    .map(([name, ex]) => `      query["${name}"] = ${formatLuaValue(ex)}`)
    .join('\n')

  const loadAllHaveExamples =
    loadParams.length > 0 &&
    loadParams.every((p: any) => undefined !== p.ex && null !== p.ex)
  const loadExampleLines = loadAllHaveExamples
    ? loadParams.map((p: any) => `      params["${p.n}"] = ${JSON.stringify(p.ex)}`).join('\n')
    : ''

  const entidEnvVar = `${PROJECTNAME}_TEST_${envToken(entity.name)}_ENTID`

  const exampleIds = liveExampleIds(entity)
  const listLiveQueryLines = liveQueryExamples(listPoint)
    .map(([name, ex]) => `      query["${name}"] = ${formatLuaValue(ex)}\n`).join('')

  // The *_ENTID key a live test reads a parameter's value from.
  const liveKey = (param: any): string =>
    ('id' === param.n ? entity.name : param.n.replace(/_id$/, '')) + '01'

  File({ name: entity.name + '_direct_test.' + target.ext }, () => {

    Content(`-- ${entity.Name} direct test

local json = require("dkjson")
local vs = require("utility.struct.struct")
local sdk = require("${model.name}_sdk")
local helpers = require("core.helpers")
local runner = require("test.runner")

${liveStrictNote(liveStrict(model, target.name), '--')}
local LIVE_STRICT = ${liveStrict(model, target.name)}

local function live_ok(result, err)
  if err ~= nil or type(result) ~= "table" or result["err"] ~= nil or not result["ok"] then
    return false
  end
  local status = helpers.to_int(result["status"])
  return status >= 200 and status < 300
end

describe("${entity.Name}Direct", function()
`)

    if (hasList && pointIsGraphql(listPoint)) {
      Content(`  it("should direct-list-${entity.name}", function()
    pending("${graphqlDirectSkip('list', entity.name)}")
  end)

`)
    }
    else if (hasList && listPoint) {
      Content(`  it("should direct-list-${entity.name}", function()
    local setup = ${entity.name}_direct_setup({
      { id = "direct01" },
      { id = "direct02" },
    })
    local _should_skip, _reason = runner.is_control_skipped("direct", "direct-list-${entity.name}", setup.live and "live" or "unit")
    if _should_skip then
      pending(_reason or "skipped via sdk-test-control.json")
      return
    end
${getOnlyKeysBlock(model, entity, 'direct-list-' + entity.name, listParams.map(liveKey))}${liveKeysBlock(listParams.map(liveKey), entidEnvVar)}    local client = setup.client

    local params = {}
    local query = {}
${listLiveQueryLines ? '    if setup.live then\n' + listLiveQueryLines + '    end\n' : ''}`)
      listParams.forEach((lp: any, i: number) => {
        Content(`    if setup.live then
      params["${lp.n}"] = setup.idmap["${liveKey(lp)}"]
    else
      params["${lp.n}"] = "direct0${i + 1}"
    end
`)
      })
      Content(`
    local result, err = client:direct({
      path = "${listPath}",
      method = "GET",
      params = params,
      query = query,
    })
    if setup.live then
      if not live_ok(result, err) then
        runner.live_miss(pending, LIVE_STRICT, "Live list failed: " .. runner.live_describe(result, err))
      end
      if runner.live_list(result["data"]) == nil then
        runner.live_miss(pending, LIVE_STRICT, "Live list returned no list: " .. runner.live_describe(result, err))
      end
      assert.is_table(runner.live_list(result["data"]))
    else
      assert.is_nil(err)
      assert.is_true(result["ok"])
      assert.are.equal(200, helpers.to_int(result["status"]))
      assert.is_table(result["data"])
      assert.are.equal(2, #result["data"])
      assert.are.equal(1, #setup.calls)
    end
  end)

`)
    }

    if (hasLoad && pointIsGraphql(loadPoint)) {
      Content(`  it("should direct-load-${entity.name}", function()
    pending("${graphqlDirectSkip('load', entity.name)}")
  end)

`)
    }
    else if (hasLoad && loadPoint) {
      const discover = !loadAllHaveExamples && hasList && 0 < loadParams.length
      const idParam = loadParams.find((p: any) => 'id' === p.n)?.n ?? loadParams[0]?.n ?? 'id'
      const loadLiveIdKeys: string[] = loadAllHaveExamples ? [] :
        discover ? listParams.map(liveKey).concat(loadParams.filter((p: any) => idParam !== p.n).map(liveKey)) :
          loadParams.map(liveKey)
      Content(`  it("should direct-load-${entity.name}", function()
    local setup = ${entity.name}_direct_setup({ id = "direct01" })
    local _should_skip, _reason = runner.is_control_skipped("direct", "direct-load-${entity.name}", setup.live and "live" or "unit")
    if _should_skip then
      pending(_reason or "skipped via sdk-test-control.json")
      return
    end
${getOnlyKeysBlock(model, entity, 'direct-load-' + entity.name, [...new Set(loadLiveIdKeys)])}${liveKeysBlock([...new Set(loadLiveIdKeys)], entidEnvVar)}    local client = setup.client

    local params = {}
    local query = {}
    if setup.live then
${loadLiveQueryLines ? loadLiveQueryLines + '\n' : ''}`)
      if (loadAllHaveExamples) {
        Content(loadExampleLines + '\n')
      }
      else if (discover) {
        Content(`      local list_result, list_err = client:direct({
        path = "${listPath}",
        method = "GET",
        params = {${listParams.map((p: any) => `["${p.n}"] = setup.idmap["${liveKey(p)}"]`).join(', ')}},
      })
      if not live_ok(list_result, list_err) then
        runner.live_miss(pending, LIVE_STRICT, "Live list discovery failed: " .. runner.live_describe(list_result, list_err))
      end
      local records = runner.live_list(list_result["data"])
      if records == nil then
        runner.live_miss(pending, LIVE_STRICT, "Live list discovery returned no list: " .. runner.live_describe(list_result, list_err))
      end
      if records[1] == nil then
        runner.live_empty(pending, "The account has no ${entity.name} record to load")
      end
      local first = type(records[1]) == "table" and records[1] or {}
      local found = first["${idParam}"] or first["id"]
      if found == nil then
        runner.live_miss(pending, LIVE_STRICT, "Live load blocked: discovery returned no usable identity")
      end
      params["${idParam}"] = found
`)
        for (const p of loadParams.filter((p: any) => idParam !== p.n)) {
          Content(`      params["${p.n}"] = setup.idmap["${liveKey(p)}"]
`)
        }
      }
      else {
        for (const p of loadParams) {
          Content(`      params["${p.n}"] = setup.idmap["${liveKey(p)}"]
`)
        }
      }
      Content(`    else
`)
      for (let i = 0; i < loadParams.length; i++) {
        Content(`      params["${loadParams[i].n}"] = "direct0${i + 1}"
`)
      }
      Content(`    end

    local result, err = client:direct({
      path = "${loadPath}",
      method = "GET",
      params = params,
      query = query,
    })
    if setup.live then
      if not live_ok(result, err) then
        runner.live_miss(pending, LIVE_STRICT, "Live load failed: " .. runner.live_describe(result, err))
      end
      if result["data"] == nil then
        runner.live_miss(pending, LIVE_STRICT, "Live load returned no data: " .. runner.live_describe(result, err))
      end
      assert.is_not_nil(result["data"])
    else
      assert.is_nil(err)
      assert.is_true(result["ok"])
      assert.are.equal(200, helpers.to_int(result["status"]))
      assert.is_not_nil(result["data"])
      if type(result["data"]) == "table" then
        assert.are.equal("direct01", result["data"]["id"])
      end
      assert.are.equal(1, #setup.calls)
    end
  end)

`)
    }

    Content(`end)


function ${entity.name}_direct_setup(mockres)
  runner.load_env_local()

  local calls = {}

  local env = runner.env_override({
    ["${entidEnvVar}"] = {},
    ["${PROJECTNAME}_TEST_LIVE"] = "FALSE",${apikeyEnvEntry}${serverEnvEntry}
  })

  local live = env["${PROJECTNAME}_TEST_LIVE"] == "TRUE"

  if live then
    local merged_opts = {${apikeyLiveField}${serverLiveField}
    }
    -- sdk-test-control.json's test.client.options goes UNDER the generated
    -- fields: it adds to the live client, it does not redirect it.
    for _k, _v in pairs(runner.live_client_options()) do
      if merged_opts[_k] == nil then
        merged_opts[_k] = _v
      end
    end
    local client = sdk.new(merged_opts)
    local idmap = env["${entidEnvVar}"]
${0 === exampleIds.length ? '' : `    if type(idmap) ~= "table" then
      idmap = {}
    end
    -- A path parameter's example stands in for an id *_ENTID does not give.
    for _k, _v in pairs({${exampleIds.map(([key, ex]) => `["${key}"] = ${formatLuaValue(ex)}`).join(', ')}}) do
      if idmap[_k] == nil then
        idmap[_k] = _v
      end
    end
`}    return {
      client = client,
      calls = calls,
      live = true,
      idmap = type(idmap) == "table" and idmap or {},
    }
  end

  local function mock_fetch(url, init)
    table.insert(calls, { url = url, init = init })
    return {
      status = 200,
      statusText = "OK",
      headers = {},
      json = function()
        if mockres ~= nil then
          return mockres
        end
        return { id = "direct01" }
      end,
      body = "mock",
    }, nil
  end

  local client = sdk.new({
    base = "http://localhost:8080",
    system = {
      fetch = mock_fetch,
    },
  })

  return {
    client = client,
    calls = calls,
    live = false,
    idmap = {},
  }
end
`)
  })
})


export {
  TestDirect
}
