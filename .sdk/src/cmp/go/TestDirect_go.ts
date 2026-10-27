
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
  serverVariables, envName, envToken, liveStrict, liveStrictNote,
  pointParts,
  pointPlaceholders,
  pointIsGraphql,
  primaryPoint,
  liveExampleIds,
  liveQueryExamples,
  liveEntity,
  liveGetOnlyReason, LIVE_GETONLY_ENV,
  liveDirectGetOnly, liveExcludedLines, liveExcludedSummary,
} from '@voxgig/sdkgen'


// Replace raw OpenAPI parameter names in path parts with model parameter names.
// Path parts may have e.g. {subBreed} while model params use sub_breed.
// When a rename mapping exists (e.g. closureId -> id), path parts contain the
// renamed form {id} but params still use the original name closure_id.
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
  const gomodule = props.gomodule

  const PROJECTNAME = envName(model)

  const strict = liveStrict(model, target.name)
  const strictConst = entity.name + 'DirectLiveStrict'

  const authActive = isAuthActive(model)
  const apikeyEnvEntry = authActive
    ? `\n\t\t"${PROJECTNAME}_APIKEY":       "",`
    : ''
  const apikeyLiveField = authActive
    ? `\n\t\t\t"apikey": env["${PROJECTNAME}_APIKEY"],`
    : ''

  // A templated server URL (OpenAPI server variables) makes a LIVE client
  // impossible to construct without values: makeOptions refuses rather than
  // request a URL with a literal `{account_id}` in it. Taken from the
  // environment, the same way the apikey is.
  const svars = serverVariables(model)
  const serverEnvEntry = svars
    .map((v: any) => `\n\t\t"${serverVarEnv(PROJECTNAME, v.name)}": ${JSON.stringify(v.dflt)},`).join('')
  const serverLiveField = 0 === svars.length ? '' :
    `\n\t\t"server": map[string]any{` +
    svars.map((v: any) =>
      `\n\t\t\t"${v.name}": env["${serverVarEnv(PROJECTNAME, v.name)}"],`).join('') +
    `\n\t\t},`


  const opnames = Object.keys(entity.op || {})
  const hasLoad = opnames.includes('load')
  const hasList = opnames.includes('list')

  if (!hasLoad && !hasList) {
    return
  }

  const loadOp = entity.op?.load
  const listOp = entity.op?.list

  const loadPoint = null == loadOp?.points ? undefined :
    primaryPoint(loadOp.points, entity.name, 'load')
  const loadIsGraphql = pointIsGraphql(loadPoint)
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

  const listPoint = null == listOp?.points ? undefined :
    primaryPoint(listOp.points, entity.name, 'list')
  const listIsGraphql = pointIsGraphql(listPoint)
  const listPath = listPoint ? normalizePathParams(pointParts(listPoint), listPoint?.g?.params || [], listPoint?.r?.param) : ''
  const listParams = listPoint?.g?.params || []

  const liveQueryLines = (point: any) => liveQueryExamples(point)
    .map(([name, ex]) => `\t\t\tquery[${JSON.stringify(name)}] = ${JSON.stringify(ex)}`)
    .join('\n')
  const loadLiveQueryLines = liveQueryLines(loadPoint)
  const listLiveQueryLines = liveQueryLines(listPoint)

  // Path params with spec-provided examples — when ALL load params have
  // spec examples, prefer them over list-bootstrap. Spec example values are
  // by definition real identifiers the API accepts (e.g. casa: "blue",
  // fecha: "2024/01/01"), avoiding the brittle list-bootstrap path-param
  // semantic mismatch.
  const loadAllHaveExamples =
    loadParams.length > 0 &&
    loadParams.every((p: any) => undefined !== p.ex && null !== p.ex)
  const loadExampleLines = loadAllHaveExamples
    ? loadParams.map((p: any) => `\t\t\tparams["${p.n}"] = ${JSON.stringify(p.ex)}`).join('\n')
    : ''

  const entidEnvVar = `${PROJECTNAME}_TEST_${envToken(entity.name)}_ENTID`

  const exampleIds = liveExampleIds(entity)
  const exampleIdBlock = 0 === exampleIds.length ? '' :
    `		// A path parameter's example stands in for an id *_ENTID does not give.
		for k, v := range map[string]any{${exampleIds.map(([key, ex]) =>
      `${JSON.stringify(key)}: ${JSON.stringify(ex)}`).join(', ')}} {
			if idmap[k] == nil {
				idmap[k] = v
			}
		}
`

  File({ name: entity.name + '_direct_test.' + target.ext }, () => {

    Content(`package sdktest

import (
	"encoding/json"
	"os"
	"strings"
	"testing"

	sdk "${gomodule}"
	"${gomodule}/core"
)

${liveStrictNote(strict, '//')}
const ${strictConst} = ${strict}

func Test${entity.Name}Direct(t *testing.T) {
`)

    if (hasList && listPoint && listIsGraphql) {
      generateDirectGraphqlGo('list', entity, listPoint, strictConst, entidEnvVar)
    }

    if (hasList && listPoint && !listIsGraphql) {
      const listParamStr = listParams.length > 0
        ? listParams.map((p: any, i: number) =>
          `"${p.n}": "direct0${i + 1}"`).join(', ')
        : ''

      const listLiveParams = listParams.map((p: any) => {
        const key = p.n === 'id'
          ? entity.name + '01'
          : p.n.replace(/_id$/, '') + '01'
        return { name: p.n, key }
      })

      // The idmap keys the live request needs; without them it is blocked.
      const listLiveIdKeys = listParams.length > 0
        ? listLiveParams.map((lp: any) => lp.key)
        : []
      const listLiveIdKeysGoLiteral = listLiveIdKeys.length > 0
        ? `[]string{${listLiveIdKeys.map((k: string) => `"${k}"`).join(', ')}}`
        : ''
      const listSkipBlock = getOnlyKeysBlock(model, entity, 'direct-list-' + entity.name, listLiveIdKeys) +
        (listLiveIdKeys.length > 0
        ? `		if setup.live {
			for _, _liveKey := range ${listLiveIdKeysGoLiteral} {
				if v := setup.idmap[_liveKey]; v == nil {
					liveMiss(t, ${strictConst}, "Live test blocked: needs %s via ${entidEnvVar}", _liveKey)
					return
				}
			}
		}
`
        : '')

      Content(`	t.Run("direct-list-${entity.name}", func(t *testing.T) {
		setup := ${entity.name}DirectSetup([]any{
			map[string]any{"id": "direct01"},
			map[string]any{"id": "direct02"},
		})
		_mode := "unit"
		if setup.live {
			_mode = "live"
		}
		if _shouldSkip, _reason := isControlSkipped("direct", "direct-list-${entity.name}", _mode); _shouldSkip {
			if _reason == "" {
				_reason = "skipped via sdk-test-control.json"
			}
			t.Skip(_reason)
			return
		}
${listSkipBlock}		client := setup.client

`)

      if (listParams.length > 0 || '' !== listLiveQueryLines) {
        Content(`		params := map[string]any{}
		query := map[string]any{}
`)
        if (listLiveQueryLines) {
          Content(`		if setup.live {
${listLiveQueryLines}
		}
`)
        }
        listLiveParams.forEach((lp: any, i: number) => {
          const placeholder = 'direct0' + (i + 1)
          Content(`		if setup.live {
			params["${lp.name}"] = setup.idmap["${lp.key}"]
		} else {
			params["${lp.name}"] = "${placeholder}"
		}
`)
        })
        Content(`
		result, err := client.Direct(map[string]any{
			"path":   "${listPath}",
			"method": "GET",
			"params": params,
			"query":  query,
		})
`)
      } else {
        Content(`
		result, err := client.Direct(map[string]any{
			"path":   "${listPath}",
			"method": "GET",
			"params": map[string]any{${listParamStr}},
		})
`)
      }

      Content(`		if setup.live {
			if err != nil {
				liveMiss(t, ${strictConst}, "Live list failed: %v", err)
			}
			if status := core.ToInt(result["status"]); result["ok"] != true || status < 200 || status >= 300 {
				liveMiss(t, ${strictConst}, "Live list failed: %s", liveDescribe(result))
			}
			if _, ok := liveList(result["data"]); !ok {
				liveMiss(t, ${strictConst}, "Live list returned no list: %s", liveDescribe(result))
			}
		} else {
			if err != nil {
				t.Fatalf("direct failed: %v", err)
			}
			if result["ok"] != true {
				t.Fatalf("expected ok to be true, got %v", result["ok"])
			}
			if core.ToInt(result["status"]) != 200 {
				t.Fatalf("expected status 200, got %v", result["status"])
			}
		}

		if !setup.live {
			if dataList, ok := result["data"].([]any); ok {
				if len(dataList) != 2 {
					t.Fatalf("expected 2 items, got %d", len(dataList))
				}
			} else {
				t.Fatalf("expected data to be an array, got %T", result["data"])
			}

			if len(*setup.calls) != 1 {
				t.Fatalf("expected 1 call, got %d", len(*setup.calls))
			}
`)

      if (listParams.length > 0) {
        Content(`			call := (*setup.calls)[0]
			if initMap, ok := call["init"].(map[string]any); ok {
				if initMap["method"] != "GET" {
					t.Fatalf("expected method GET, got %v", initMap["method"])
				}
			}
			if url, ok := call["url"].(string); ok {
`)
        for (let i = 0; i < listParams.length; i++) {
          Content(`				if !strings.Contains(url, "direct0${i + 1}") {
					t.Fatalf("expected url to contain direct0${i + 1}, got %v", url)
				}
`)
        }
        Content(`			}
`)
      }

      Content(`		}
	})

`)
    }

    if (hasLoad && loadPoint && loadIsGraphql) {
      generateDirectGraphqlGo('load', entity, loadPoint, strictConst, entidEnvVar)
    }

    // Generate load test - in live mode, first list to get a real entity ID
    if (hasLoad && loadPoint && !loadIsGraphql) {
      const loadParamStr = loadParams.length > 0
        ? loadParams.map((p: any, i: number) =>
          `"${p.n}": "direct0${i + 1}"`).join(', ')
        : ''

      const ancestorParams = loadParams.filter((p: any) => p.n !== 'id')

      const liveKey = (p: any) => p.n === 'id' ? entity.name + '01' : p.n.replace(/_id$/, '') + '01'
      let loadLiveIdKeys: string[] = []
      if (loadParams.length > 0 && !loadAllHaveExamples) {
        loadLiveIdKeys = [...new Set((hasList ?
          [...listParams, ...loadParams.filter((p: any) => p.n !== 'id')] : loadParams).map(liveKey))]
      }
      const loadSkipBlock = getOnlyKeysBlock(model, entity, 'direct-load-' + entity.name, loadLiveIdKeys) +
        (loadLiveIdKeys.length > 0
        ? `		if setup.live {
			for _, _liveKey := range []string{${loadLiveIdKeys.map(k => `"${k}"`).join(', ')}} {
				if v := setup.idmap[_liveKey]; v == nil {
					liveMiss(t, ${strictConst}, "Live test blocked: needs %s via ${entidEnvVar}", _liveKey)
					return
				}
			}
		}
`
        : '')

      Content(`	t.Run("direct-load-${entity.name}", func(t *testing.T) {
		setup := ${entity.name}DirectSetup(map[string]any{"id": "direct01"})
		_mode := "unit"
		if setup.live {
			_mode = "live"
		}
		if _shouldSkip, _reason := isControlSkipped("direct", "direct-load-${entity.name}", _mode); _shouldSkip {
			if _reason == "" {
				_reason = "skipped via sdk-test-control.json"
			}
			t.Skip(_reason)
			return
		}
${loadSkipBlock}		client := setup.client

`)

      // Always emit a query map so the test can pass it to Direct(); only
      // set values in live mode.
      const needsQuery = loadParams.length > 0 || loadLiveQueryLines !== ''
      if (needsQuery) {
        Content(`		params := map[string]any{}
		query := map[string]any{}
`)

        Content(`		if setup.live {
`)

        if (loadLiveQueryLines) {
          Content(loadLiveQueryLines + '\n')
        }

        if (loadAllHaveExamples) {
          Content(loadExampleLines + '\n')
        } else if (hasList && loadParams.length > 0) {
          Content(`			listParams := map[string]any{}
`)
          for (const p of listParams) {
            const key = p.n === 'id'
              ? entity.name + '01'
              : p.n.replace(/_id$/, '') + '01'
            Content(`			listParams["${p.n}"] = setup.idmap["${key}"]
`)
          }

          Content(`			listResult, listErr := client.Direct(map[string]any{
				"path":   "${listPath}",
				"method": "GET",
				"params": listParams,
			})
			if listErr != nil {
				liveMiss(t, ${strictConst}, "Live list discovery failed: %v", listErr)
			}
			if listResult["ok"] != true {
				liveMiss(t, ${strictConst}, "Live list discovery failed: %s", liveDescribe(listResult))
			}
			listData, listOk := liveList(listResult["data"])
			if !listOk {
				liveMiss(t, ${strictConst}, "Live list discovery returned no list: %s", liveDescribe(listResult))
			}
			if len(listData) == 0 {
				liveEmpty(t, "The account has no ${entity.name} record to load")
			}
			firstEnt := core.ToMapAny(listData[0])
			if firstEnt["id"] == nil {
				liveMiss(t, ${strictConst}, "Live load blocked: discovery returned no usable identity")
			}
			params["id"] = firstEnt["id"]
`)
          for (const p of ancestorParams) {
            const key = p.n.replace(/_id$/, '') + '01'
            Content(`			params["${p.n}"] = setup.idmap["${key}"]
`)
          }
        } else if (loadParams.length > 0) {
          for (const p of loadParams) {
            Content(`			params["${p.n}"] = setup.idmap["${liveKey(p)}"]
`)
          }
        }

        if (loadParams.length > 0) {
          Content(`		} else {
`)
          for (let i = 0; i < loadParams.length; i++) {
            Content(`			params["${loadParams[i].n}"] = "direct0${i + 1}"
`)
          }
        }
        Content(`		}
`)
      }

      Content(`
		result, err := client.Direct(map[string]any{
			"path":   "${loadPath}",
			"method": "GET",
`)
      if (loadParams.length > 0) {
        Content(`			"params": params,
			"query":  query,
`)
      } else if (loadLiveQueryLines) {
        Content(`			"params": params,
			"query":  query,
`)
      } else {
        Content(`			"params": map[string]any{},
`)
      }
      Content(`		})
		if setup.live {
			if err != nil {
				liveMiss(t, ${strictConst}, "Live load failed: %v", err)
			}
			if status := core.ToInt(result["status"]); result["ok"] != true || status < 200 || status >= 300 {
				liveMiss(t, ${strictConst}, "Live load failed: %s", liveDescribe(result))
			}
			if result["data"] == nil {
				liveMiss(t, ${strictConst}, "Live load returned no data: %s", liveDescribe(result))
			}
		} else {
			if err != nil {
				t.Fatalf("direct failed: %v", err)
			}
			if result["ok"] != true {
				t.Fatalf("expected ok to be true, got %v", result["ok"])
			}
			if core.ToInt(result["status"]) != 200 {
				t.Fatalf("expected status 200, got %v", result["status"])
			}
			if result["data"] == nil {
				t.Fatal("expected data to be non-nil")
			}
		}

		if !setup.live {
			if dataMap, ok := result["data"].(map[string]any); ok {
				if dataMap["id"] != "direct01" {
					t.Fatalf("expected data.id to be direct01, got %v", dataMap["id"])
				}
			}

			if len(*setup.calls) != 1 {
				t.Fatalf("expected 1 call, got %d", len(*setup.calls))
			}
			call := (*setup.calls)[0]
			if initMap, ok := call["init"].(map[string]any); ok {
				if initMap["method"] != "GET" {
					t.Fatalf("expected method GET, got %v", initMap["method"])
				}
			}
			if ${loadParams.length > 0 ? 'url' : '_'}, ok := call["url"].(string); ok {
`)

      for (let i = 0; i < loadParams.length; i++) {
        Content(`				if !strings.Contains(url, "direct0${i + 1}") {
					t.Fatalf("expected url to contain direct0${i + 1}, got %v", url)
				}
`)
      }

      Content(`			}
		}
	})

`)
    }

    Content(`}

type ${entity.name}DirectSetupResult struct {
	client *sdk.${model.const.Name}SDK
	calls  *[]map[string]any
	live   bool
	idmap  map[string]any
}

func ${entity.name}DirectSetup(mockres any) *${entity.name}DirectSetupResult {
	loadEnvLocal()

	calls := &[]map[string]any{}

	env := envOverride(map[string]any{
		"${entidEnvVar}": map[string]any{},
		"${PROJECTNAME}_TEST_LIVE":    "FALSE",${apikeyEnvEntry}${serverEnvEntry}
	})

	live := env["${PROJECTNAME}_TEST_LIVE"] == "TRUE"

	if live {
		// sdk-test-control.json's test.client.options seeds the live
		// client; the generated fields below overwrite anything they name.
		mergedOpts := map[string]any{}
		for k, v := range liveClientOptions() {
			mergedOpts[k] = v
		}
		for k, v := range map[string]any{${apikeyLiveField}${serverLiveField}
		} {
			mergedOpts[k] = v
		}
		client := sdk.New${model.const.Name}SDK(mergedOpts)

		idmap := map[string]any{}
		if entidRaw, ok := env["${entidEnvVar}"]; ok {
			if entidStr, ok := entidRaw.(string); ok && strings.HasPrefix(entidStr, "{") {
				json.Unmarshal([]byte(entidStr), &idmap)
			} else if entidMap, ok := entidRaw.(map[string]any); ok {
				idmap = entidMap
			}
		}
${exampleIdBlock}
		return &${entity.name}DirectSetupResult{client: client, calls: calls, live: true, idmap: idmap}
	}

	mockFetch := func(url string, init map[string]any) (map[string]any, error) {
		*calls = append(*calls, map[string]any{"url": url, "init": init})
		return map[string]any{
			"status":     200,
			"statusText": "OK",
			"headers":    map[string]any{},
			"json": (func() any)(func() any {
				if mockres != nil {
					return mockres
				}
				return map[string]any{"id": "direct01"}
			}),
		}, nil
	}

	client := sdk.New${model.const.Name}SDK(map[string]any{
		"base": "http://localhost:8080",
		"system": map[string]any{
			"fetch": (func(string, map[string]any) (map[string]any, error))(mockFetch),
		},
	})

	return &${entity.name}DirectSetupResult{client: client, calls: calls, live: false, idmap: map[string]any{}}
}
`)

    Content(`
var _ = os.Getenv
var _ = json.Unmarshal
`)
  })
})


// A GET-only live run excludes a test needing an id that only a write gives.
function getOnlyKeysBlock(model: any, entity: any, test: string, keys: string[]): string {
  return liveDirectGetOnly(model, entity, test, keys).map((miss) =>
    `		if setup.live && os.Getenv(${JSON.stringify(LIVE_GETONLY_ENV)}) == "TRUE" && setup.idmap[${JSON.stringify(miss.key)}] == nil {
			t.Log(${JSON.stringify(liveExcludedLines({ excluded: [miss] })[0])})
			t.Skip(${JSON.stringify(liveExcludedSummary({ excluded: [miss] }))})
			return
		}
`).join('')
}


// GraphQL-backed op needs POST+body, not a REST-shaped GET+params Direct()
// call — reuse apidef's own point.gq.doc via the SDK's Graphql() hatch.
// Mirrors TestDirect_ts.ts's generateDirectGraphql.
function generateDirectGraphqlGo(
  opname: 'load' | 'list',
  entity: ModelEntity,
  point: any,
  strictConst: string,
  entidEnvVar: string,
) {
  const doc: string = point.gq.doc
  const vars: any[] = point.gq.vars || []

  // A GraphQL request is a POST, which a GET-only live run does not send.
  const getOnlyReason = liveGetOnlyReason(point)
  const getOnlySkip = null == getOnlyReason ? '' :
    `\t\tif setup.live && os.Getenv(${JSON.stringify(LIVE_GETONLY_ENV)}) == "TRUE" {
\t\t\tt.Skip(${JSON.stringify(getOnlyReason)})
\t\t\treturn
\t\t}
`

  const mockVarLines = vars.map((v: any, i: number) =>
    `\t\tvariables["${v.name}"] = "direct0${i + 1}"`).join('\n')

  // A live call sends only the variables the document cannot run without.
  const liveVars = vars.filter((v: any) => String(v.gqltype || '').endsWith('!'))

  const liveVarLines = liveVars.map((v: any) => {
    const from = v.from || v.name
    const key = ('id' === from ? entity.name : from.replace(/_id$/, '')) + '01'
    return `\t\tvariables["${v.name}"] = setup.idmap["${key}"]`
  }).join('\n')

  const liveIdKeys = liveVars.map((v: any) => {
    const from = v.from || v.name
    return ('id' === from ? entity.name : from.replace(/_id$/, '')) + '01'
  })

  const skipBlock = liveIdKeys.length > 0
    ? `\t\tif setup.live {
\t\t\tfor _, _liveKey := range []string{${liveIdKeys.map(k => `"${k}"`).join(', ')}} {
\t\t\t\tif v := setup.idmap[_liveKey]; v == nil {
\t\t\t\t\tliveMiss(t, ${strictConst}, "Live test blocked: needs %s via ${entidEnvVar}", _liveKey)
\t\t\t\t\treturn
\t\t\t\t}
\t\t\t}
\t\t}
`
    : ''

  // Asserted against the OUTGOING request body, not the mocked response —
  // response-shape correctness is the entity-level tests' job. The mock
  // JSON-encodes a map body to a string (see makeFetchDefUtil), so this
  // is a substring check, same as the ts/js mocks.
  const varAsserts = vars.map((v: any, i: number) =>
    `\t\t\tif sentVars[${JSON.stringify(v.name)}] != "direct0${i + 1}" {\n` +
    `\t\t\t\tt.Fatalf("expected variable ${v.name} to be direct0${i + 1}, got %v", sentVars[${JSON.stringify(v.name)}])\n` +
    `\t\t\t}`).join('\n')

  Content(`	t.Run("direct-${opname}-${entity.name}", func(t *testing.T) {
		setup := ${entity.name}DirectSetup(map[string]any{"id": "direct01"})
		_mode := "unit"
		if setup.live {
			_mode = "live"
		}
		if _shouldSkip, _reason := isControlSkipped("direct", "direct-${opname}-${entity.name}", _mode); _shouldSkip {
			if _reason == "" {
				_reason = "skipped via sdk-test-control.json"
			}
			t.Skip(_reason)
			return
		}
${getOnlySkip}${skipBlock}		client := setup.client

		variables := map[string]any{}
		if setup.live {
${liveVarLines || '\t\t// no variables'}
		} else {
${mockVarLines || '\t\t// no variables'}
		}

		result, err := client.Graphql(${JSON.stringify(doc)}, variables, nil)

		if setup.live {
			if err != nil {
				liveMiss(t, ${strictConst}, "Live ${opname} failed: %v", err)
			}
			if result["ok"] != true {
				liveMiss(t, ${strictConst}, "Live ${opname} failed: %s", liveDescribe(result))
			}
			if result["data"] == nil {
				liveMiss(t, ${strictConst}, "Live ${opname} returned no data: %s", liveDescribe(result))
			}
		} else {
			if err != nil {
				t.Fatalf("direct failed: %v", err)
			}
			if result["ok"] != true {
				t.Fatalf("expected ok to be true, got %v", result["ok"])
			}
			if core.ToInt(result["status"]) != 200 {
				t.Fatalf("expected status 200, got %v", result["status"])
			}
			if result["data"] == nil {
				t.Fatal("expected data to be non-nil")
			}
			if len(*setup.calls) != 1 {
				t.Fatalf("expected 1 call, got %d", len(*setup.calls))
			}
			call := (*setup.calls)[0]
			initMap, _ := call["init"].(map[string]any)
			if initMap["method"] != "POST" {
				t.Fatalf("expected method POST, got %v", initMap["method"])
			}
			bodyStr, _ := initMap["body"].(string)
			var sent map[string]any
			if err := json.Unmarshal([]byte(bodyStr), &sent); err != nil {
				t.Fatalf("expected a JSON body, got %v", bodyStr)
			}
			if sent["query"] != ${JSON.stringify(doc)} {
				t.Fatalf("expected the operation document, got %v", sent["query"])
			}
			sentVars, _ := sent["variables"].(map[string]any)
			_ = sentVars
${varAsserts}
		}
	})

`)
}


export {
  TestDirect
}
