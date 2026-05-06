
import {
  depluralize,
} from '@voxgig/apidef'

import {
  Content,
  File,
  cmp,
  snakify,
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
  const gomodule = props.gomodule

  const PROJECTNAME = model.Name.toUpperCase().replace(/[^A-Z_]/g, '_')

  const opnames = Object.keys(entity.op)
  const hasLoad = opnames.includes('load')
  const hasList = opnames.includes('list')

  if (!hasLoad && !hasList) {
    return
  }

  const loadOp = entity.op.load
  const listOp = entity.op.list

  // Get load point info
  const loadPoint = loadOp?.points?.[0]
  const loadPath = loadPoint ? normalizePathParams(loadPoint.parts || [], loadPoint?.args?.params || [], loadPoint?.rename?.param) : ''
  const loadParams = loadPoint?.args?.params || []

  // Get list point info
  const listPoint = listOp?.points?.[0]
  const listPath = listPoint ? normalizePathParams(listPoint.parts || [], listPoint?.args?.params || [], listPoint?.rename?.param) : ''
  const listParams = listPoint?.args?.params || []

  // Build the ENTID env var name for this entity
  const entidEnvVar = `${PROJECTNAME}_TEST_${entity.Name.toUpperCase().replace(/[^A-Z_]/g, '_')}_ENTID`

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

func Test${entity.Name}Direct(t *testing.T) {
`)

    // Generate list test first (load needs list results in live mode)
    if (hasList && listPoint) {
      const listParamStr = listParams.length > 0
        ? listParams.map((p: any, i: number) =>
          `"${p.name}": "direct0${i + 1}"`).join(', ')
        : ''

      // Build live params for list
      const listLiveParams = listParams.map((p: any) => {
        const key = p.name === 'id'
          ? entity.name + '01'
          : p.name.replace(/_id$/, '') + '01'
        return { name: p.name, key }
      })

      Content(`	t.Run("direct-list-${entity.name}", func(t *testing.T) {
		setup := ${entity.name}DirectSetup([]any{
			map[string]any{"id": "direct01"},
			map[string]any{"id": "direct02"},
		})
		client := setup.client

`)

      if (listParams.length > 0) {
        Content(`		params := map[string]any{}
`)
        listLiveParams.forEach((lp: any, i: number) => {
          // Each path param gets its own placeholder ("direct01", "direct02", ...)
          // in non-live mode so URL-shape assertions can verify the params
          // landed in distinct positions in the URL.
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

      Content(`		if err != nil {
			t.Fatalf("direct failed: %v", err)
		}

		if result["ok"] != true {
			t.Fatalf("expected ok to be true, got %v", result["ok"])
		}
		if core.ToInt(result["status"]) != 200 {
			t.Fatalf("expected status 200, got %v", result["status"])
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

    // Generate load test - in live mode, first list to get a real entity ID
    if (hasLoad && loadPoint) {
      const loadParamStr = loadParams.length > 0
        ? loadParams.map((p: any, i: number) =>
          `"${p.name}": "direct0${i + 1}"`).join(', ')
        : ''

      // Identify ancestor params (not 'id') for live mode
      const ancestorParams = loadParams.filter((p: any) => p.name !== 'id')

      Content(`	t.Run("direct-load-${entity.name}", func(t *testing.T) {
		setup := ${entity.name}DirectSetup(map[string]any{"id": "direct01"})
		client := setup.client

`)

      if (loadParams.length > 0) {
        Content(`		params := map[string]any{}
`)

        Content(`		if setup.live {
`)

        // In live mode: first list to get a real entity, then use its ID
        if (hasList) {
          // Build list params from idmap
          Content(`			listParams := map[string]any{}
`)
          for (const p of listParams) {
            const key = p.name === 'id'
              ? entity.name + '01'
              : p.name.replace(/_id$/, '') + '01'
            Content(`			listParams["${p.name}"] = setup.idmap["${key}"]
`)
          }

          Content(`			listResult, listErr := client.Direct(map[string]any{
				"path":   "${listPath}",
				"method": "GET",
				"params": listParams,
			})
			if listErr != nil {
				t.Fatalf("list for load setup failed: %v", listErr)
			}
			if listResult["ok"] != true {
				t.Fatalf("list for load setup not ok: %v", listResult)
			}

			// Get first entity ID from list
			listData, _ := listResult["data"].([]any)
			if len(listData) == 0 {
				t.Skip("no entities to load in live mode")
			}
			firstEnt := core.ToMapAny(listData[0])
			params["id"] = firstEnt["id"]
`)
          // Set ancestor params from idmap
          for (const p of ancestorParams) {
            const key = p.name.replace(/_id$/, '') + '01'
            Content(`			params["${p.name}"] = setup.idmap["${key}"]
`)
          }
        }

        Content(`		} else {
`)
        for (let i = 0; i < loadParams.length; i++) {
          Content(`			params["${loadParams[i].name}"] = "direct0${i + 1}"
`)
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
`)
      } else {
        Content(`			"params": map[string]any{},
`)
      }
      Content(`		})
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
		"${PROJECTNAME}_TEST_LIVE":    "FALSE",
		"${PROJECTNAME}_APIKEY":       "NONE",
	})

	live := env["${PROJECTNAME}_TEST_LIVE"] == "TRUE"

	if live {
		mergedOpts := map[string]any{
			"apikey": env["${PROJECTNAME}_APIKEY"],
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

    // Suppress unused import warnings
    Content(`
var _ = os.Getenv
var _ = json.Unmarshal
`)
  })
})


export {
  TestDirect
}
