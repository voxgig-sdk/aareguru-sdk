
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

import { formatRubyValue } from './utility_rb'


// Blocked without the ids its request needs, rather than sent with nil.
// A GET-only live run excludes a test needing an id that only a write gives.
function getOnlyKeysBlock(model: any, entity: any, test: string, keys: string[]): string {
  return liveDirectGetOnly(model, entity, test, keys).map((miss) =>
    `    if setup[:live] && ENV[${formatRubyValue(LIVE_GETONLY_ENV)}] == "TRUE" && setup[:idmap][${formatRubyValue(miss.key)}].nil?
      puts ${formatRubyValue(liveExcludedLines({ excluded: [miss] })[0])}
      skip(${formatRubyValue(liveExcludedSummary({ excluded: [miss] }))})
    end
`).join('')
}


function liveKeysBlock(keys: string[], entidEnvVar: string): string {
  return 0 === keys.length ? '' : `    if setup[:live]
      [${keys.map((k) => JSON.stringify(k)).join(', ')}].each do |_live_key|
        if setup[:idmap][_live_key].nil?
          Runner.live_miss(LIVE_STRICT, "Live test blocked: needs #{_live_key} via ${entidEnvVar}")
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
    ? `\n    "${PROJECTNAME}_APIKEY" => "",`
    : ''
  const apikeyLiveField = authActive
    ? `\n      "apikey" => env["${PROJECTNAME}_APIKEY"],`
    : ''

  // A templated server URL (OpenAPI server variables) makes a LIVE client
  // impossible to construct without values: makeOptions raises rather than
  // request a URL with a literal `{account_id}` in it. So the live suite
  // takes them from the environment the same way it takes the apikey.
  const svars = serverVariables(model)
  const serverEnvEntry = svars
    .map((v: any) => `\n    "${serverVarEnv(PROJECTNAME, v.name)}" => ${formatRubyValue(v.dflt)},`).join('')
  const serverLiveField = 0 === svars.length ? '' : `
      "server" => {${svars
      .map((v: any) => `
        "${v.name}" => env["${serverVarEnv(PROJECTNAME, v.name)}"],`).join('')}
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
    .map(([name, ex]) => `      query["${name}"] = ${formatRubyValue(ex)}`)
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
    .map(([name, ex]) => `      query["${name}"] = ${formatRubyValue(ex)}\n`).join('')

  // The *_ENTID key a live test reads a parameter's value from.
  const liveKey = (param: any): string =>
    ('id' === param.n ? entity.name : param.n.replace(/_id$/, '')) + '01'

  File({ name: entity.name + '_direct_test.' + target.ext }, () => {

    Content(`# ${entity.Name} direct test

require "minitest/autorun"
require "json"
require_relative "../${model.const.Name}_sdk"
require_relative "runner"

class ${entity.Name}DirectTest < Minitest::Test
${liveStrictNote(liveStrict(model, target.name), '#', '  ')}
  LIVE_STRICT = ${liveStrict(model, target.name)}

  def live_ok(result)
    status = Helpers.to_int(result["status"])
    result["err"].nil? && result["ok"] && status >= 200 && status < 300
  end

`)

    if (hasList && pointIsGraphql(listPoint)) {
      Content(`  def test_direct_list_${entity.name}
    skip("${graphqlDirectSkip('list', entity.name)}")
  end

`)
    }
    else if (hasList && listPoint) {
      Content(`  def test_direct_list_${entity.name}
    setup = ${entity.name}_direct_setup([
      { "id" => "direct01" },
      { "id" => "direct02" },
    ])
    _should_skip, _reason = Runner.is_control_skipped("direct", "direct-list-${entity.name}", setup[:live] ? "live" : "unit")
    if _should_skip
      skip(_reason || "skipped via sdk-test-control.json")
      return
    end
${getOnlyKeysBlock(model, entity, 'direct-list-' + entity.name, listParams.map(liveKey))}${liveKeysBlock(listParams.map(liveKey), entidEnvVar)}    client = setup[:client]

    params = {}
    query = {}
${listLiveQueryLines ? '    if setup[:live]\n' + listLiveQueryLines + '    end\n' : ''}`)
      listParams.forEach((lp: any, i: number) => {
        Content(`    params["${lp.n}"] = setup[:live] ? setup[:idmap]["${liveKey(lp)}"] : "direct0${i + 1}"
`)
      })
      Content(`
    result = client.direct({
      "path" => "${listPath}",
      "method" => "GET",
      "params" => params,
      "query" => query,
    })
    if setup[:live]
      unless live_ok(result)
        Runner.live_miss(LIVE_STRICT, "Live list failed: " + Runner.live_describe(result))
      end
      if Runner.live_list(result["data"]).nil?
        Runner.live_miss(LIVE_STRICT, "Live list returned no list: " + Runner.live_describe(result))
      end
      assert Runner.live_list(result["data"]).is_a?(Array)
    else
      assert_nil result["err"]
      assert result["ok"]
      assert_equal 200, Helpers.to_int(result["status"])
      assert result["data"].is_a?(Array)
      assert_equal 2, result["data"].length
      assert_equal 1, setup[:calls].length
    end
  end

`)
    }

    if (hasLoad && pointIsGraphql(loadPoint)) {
      Content(`  def test_direct_load_${entity.name}
    skip("${graphqlDirectSkip('load', entity.name)}")
  end

`)
    }
    else if (hasLoad && loadPoint) {
      const discover = !loadAllHaveExamples && hasList && 0 < loadParams.length
      const idParam = loadParams.find((p: any) => 'id' === p.n)?.n ?? loadParams[0]?.n ?? 'id'
      const loadLiveIdKeys: string[] = loadAllHaveExamples ? [] :
        discover ? listParams.map(liveKey).concat(loadParams.filter((p: any) => idParam !== p.n).map(liveKey)) :
          loadParams.map(liveKey)
      Content(`  def test_direct_load_${entity.name}
    setup = ${entity.name}_direct_setup({ "id" => "direct01" })
    _should_skip, _reason = Runner.is_control_skipped("direct", "direct-load-${entity.name}", setup[:live] ? "live" : "unit")
    if _should_skip
      skip(_reason || "skipped via sdk-test-control.json")
      return
    end
${getOnlyKeysBlock(model, entity, 'direct-load-' + entity.name, [...new Set(loadLiveIdKeys)])}${liveKeysBlock([...new Set(loadLiveIdKeys)], entidEnvVar)}    client = setup[:client]

    params = {}
    query = {}
    if setup[:live]
${loadLiveQueryLines ? loadLiveQueryLines + '\n' : ''}`)
      if (loadAllHaveExamples) {
        Content(loadExampleLines + '\n')
      }
      else if (discover) {
        Content(`      list_result = client.direct({
        "path" => "${listPath}",
        "method" => "GET",
        "params" => {${listParams.map((p: any) => `"${p.n}" => setup[:idmap]["${liveKey(p)}"]`).join(', ')}},
      })
      unless live_ok(list_result)
        Runner.live_miss(LIVE_STRICT, "Live list discovery failed: " + Runner.live_describe(list_result))
      end
      records = Runner.live_list(list_result["data"])
      if records.nil?
        Runner.live_miss(LIVE_STRICT, "Live list discovery returned no list: " + Runner.live_describe(list_result))
      end
      if records.empty?
        Runner.live_empty("The account has no ${entity.name} record to load")
      end
      first = records[0].is_a?(Hash) ? records[0] : {}
      found = first.fetch("${idParam}", first["id"])
      if found.nil?
        Runner.live_miss(LIVE_STRICT, "Live load blocked: discovery returned no usable identity")
      end
      params["${idParam}"] = found
`)
        for (const p of loadParams.filter((p: any) => idParam !== p.n)) {
          Content(`      params["${p.n}"] = setup[:idmap]["${liveKey(p)}"]
`)
        }
      }
      else {
        for (const p of loadParams) {
          Content(`      params["${p.n}"] = setup[:idmap]["${liveKey(p)}"]
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

    result = client.direct({
      "path" => "${loadPath}",
      "method" => "GET",
      "params" => params,
      "query" => query,
    })
    if setup[:live]
      unless live_ok(result)
        Runner.live_miss(LIVE_STRICT, "Live load failed: " + Runner.live_describe(result))
      end
      if result["data"].nil?
        Runner.live_miss(LIVE_STRICT, "Live load returned no data: " + Runner.live_describe(result))
      end
      assert !result["data"].nil?
    else
      assert_nil result["err"]
      assert result["ok"]
      assert_equal 200, Helpers.to_int(result["status"])
      assert !result["data"].nil?
      if result["data"].is_a?(Hash)
        assert_equal "direct01", result["data"]["id"]
      end
      assert_equal 1, setup[:calls].length
    end
  end

`)
    }

    Content(`end


def ${entity.name}_direct_setup(mockres)
  Runner.load_env_local

  calls = []

  env = Runner.env_override({
    "${entidEnvVar}" => {},
    "${PROJECTNAME}_TEST_LIVE" => "FALSE",${apikeyEnvEntry}${serverEnvEntry}
  })

  live = env["${PROJECTNAME}_TEST_LIVE"] == "TRUE"

  if live
    # Merged so the generated fields win: sdk-test-control.json's
    # test.client.options adds to the live client, it does not redirect it.
    merged_opts = Runner.live_client_options.merge({${apikeyLiveField}${serverLiveField}
    })
    client = ${model.const.Name}SDK.new(merged_opts)
    idmap = env["${entidEnvVar}"]
${0 === exampleIds.length ? '' : `    # A path parameter's example stands in for an id *_ENTID does not give.
    idmap = { ${exampleIds.map(([key, ex]) => `"${key}" => ${formatRubyValue(ex)}`).join(', ')} }
      .merge(idmap.is_a?(Hash) ? idmap : {})
`}    return {
      client: client,
      calls: calls,
      live: true,
      idmap: idmap.is_a?(Hash) ? idmap : {},
    }
  end

  mock_fetch = ->(url, init) {
    calls.push({ "url" => url, "init" => init })
    return {
      "status" => 200,
      "statusText" => "OK",
      "headers" => {},
      "json" => ->() {
        if !mockres.nil?
          return mockres
        end
        return { "id" => "direct01" }
      },
      "body" => "mock",
    }, nil
  }

  client = ${model.const.Name}SDK.new({
    "base" => "http://localhost:8080",
    "system" => {
      "fetch" => mock_fetch,
    },
  })

  {
    client: client,
    calls: calls,
    live: false,
    idmap: {},
  }
end
`)
  })
})


export {
  TestDirect
}
