import { flowSteps, opReachable } from '@voxgig/sdkgen'

import {
  flatten,
  items,
  join,
} from '@voxgig/struct'

import {
  KIT,
  Model,
  ModelEntity,
  ModelEntityFlow,
  ModelEntityFlowStep,
  getModelPath,
  nom,
} from '@voxgig/apidef'


import {
  Content,
  File,
  cmp,
  each,
  buildIdNames,
  getMatchEntries,
  isAuthActive,
  serverVarEnv,
  serverVariables,
  entityDataIdField, envName, envToken,
  invalidRequest,
  liveFlowNeeds, liveStrict, liveStrictNote,
  liveRouteExamples, liveStepExamples, flowLoadRoute, flowLoadReadsRecord,
  liveGetOnly, liveExcludedLines, liveExcludedSummary, LIVE_GETONLY_ENV,
  liveEntity,
} from '@voxgig/sdkgen'


// Convert snake_case to camelCase for Go variable names.
function goVar(name: string): string {
  return name.replace(/_([a-z0-9])/g, (_: any, c: string) => c.toUpperCase())
}


type GenCtx = {
  model: Model
  entity: ModelEntity
  gomodule: string
  flow: ModelEntityFlow
  PROJUPPER: string
}

type OpGen = (ctx: GenCtx, step: ModelEntityFlowStep, index: number) => void


const TestEntity = cmp(function TestEntity(props: any) {
  const ctx$ = props.ctx$
  const model: Model = ctx$.model

  const target = props.target
  const entity: ModelEntity = liveEntity(ctx$, props.entity)
  const gomodule: string = props.gomodule

  // The stream test streams the "list" op with no match and asserts a 3-item
  // collection, so it only applies to an entity whose list a bare call can
  // reach: not one without a list (e.g. Batch = create/load), not a nested
  // list needing its parent's id, and not one whose routes all need an action.
  const hasList = opReachable((entity.op as any)?.list, [])

  const basicflow: ModelEntityFlow | undefined =
    getModelPath(model, `main.${KIT}.flow.Basic${nom(entity, 'Name')}Flow`)
  if (null == basicflow || true !== basicflow.active) {
    return
  }

  const PROJUPPER = envName(model)

  const authActive = isAuthActive(model)
  const apikeyEnvEntry = authActive
    ? `\n\t\t"${PROJUPPER}_APIKEY":         "",`
    : ''
  const apikeyLiveField = authActive
    ? `\n\t\t\t\t"apikey": env["${PROJUPPER}_APIKEY"],`
    : ''


  // A templated server URL (OpenAPI server variables) makes a LIVE client
  // impossible to construct without values: makeOptions refuses rather than
  // request a URL with a literal `{account_id}` in it. Taken from the
  // environment, the same way the apikey is.
  const svars = serverVariables(model)
  const serverEnvEntry = svars
    .map((v: any) => `\n\t\t"${serverVarEnv(PROJUPPER, v.name)}": ${JSON.stringify(v.dflt)},`).join('')
  const serverLiveField = 0 === svars.length ? '' :
    `\n\t\t\t\t"server": map[string]any{` +
    svars.map((v: any) =>
      `\n\t\t\t\t\t"${v.name}": env["${serverVarEnv(PROJUPPER, v.name)}"],`).join('') +
    `\n\t\t\t\t},`

  const idnames = buildIdNames(entity, basicflow)
  const idnamesStr = idnames.map(n => `"${n}"`).join(', ')

  // Get all update data entries for alias generation
  const allSteps = Object.values(flowSteps(basicflow)) as any[]
  const updateStep = allSteps.find((s: any) => s.o === 'update')
  const updateData = updateStep?.d
    ? Object.entries(updateStep.d).filter(([k]: any) => k !== 'id' && !k.endsWith('$'))
    : []
  const aliases = updateData.map(([k, v]: any) => [k, v])

  const genCtx: GenCtx = { model, entity, gomodule, flow: basicflow, PROJUPPER }

  const strict = liveStrict(model, target.name)
  const strictConst = entity.name + 'EntityLiveStrict'

  // fmt is only used by the TextFieldMark Update branch — omit the import
  // when no step needs it, otherwise Go's strict unused-import check fails.
  const needsFmt = allSteps.some((s: any) =>
    s.o === 'update' &&
    s.i.textfield &&
    Array.isArray(s.s) &&
    s.s.some((sp: any) => sp.apply === 'TextFieldMark'))

  File({ name: entity.name + '_entity_test.' + target.ext }, () => {

    Content(`package sdktest

import (
	"encoding/json"${needsFmt ? '\n\t"fmt"' : ''}
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	sdk "${gomodule}"
	"${gomodule}/core"

	vs "${gomodule}/utility/struct"
)

${liveStrictNote(strict, '//')}
const ${strictConst} = ${strict}

${hasList ? failHookType(entity) : ''}
func Test${entity.Name}Entity(t *testing.T) {
	t.Run("instance", func(t *testing.T) {
		testsdk := sdk.TestSDK(nil, nil)
		ent := testsdk.${entity.Name}(nil)
		if ent == nil {
			t.Fatal("expected non-nil ${entity.Name}Entity")
		}
	})
${hasList ? `
	// Feature #4: the entity Stream(action, ...) method runs the op pipeline and
	// returns a channel over result items. With the streaming feature active it
	// yields the feature's incremental output; otherwise it falls back to the
	// materialised list so Stream always yields.
	t.Run("stream", func(t *testing.T) {
		seed := map[string]any{
			"entity": map[string]any{
				"${entity.name}": map[string]any{
					"s1": map[string]any{"id": "s1"},
					"s2": map[string]any{"id": "s2"},
					"s3": map[string]any{"id": "s3"},
				},
			},
		}

		// Fallback: streaming inactive -> yields the materialised list items.
		base := sdk.TestSDK(seed, nil)
		var seen []any
		for si := range base.${entity.Name}(nil).Stream("list", nil, nil) {
			if si.Err != nil {
				t.Fatalf("stream failed: %v", si.Err)
			}
			seen = append(seen, si.Item)
		}
		if len(seen) != 3 {
			t.Fatalf("expected 3 streamed items, got %d", len(seen))
		}

		// Inbound: streaming active -> yields each item from the feature iterator.
		hasStreaming := false
		if fm, ok := core.SharedConfig()["feature"].(map[string]any); ok {
			_, hasStreaming = fm["streaming"]
		}
		if hasStreaming {
			streamSdk := sdk.TestSDK(seed, map[string]any{
				"feature": map[string]any{"streaming": map[string]any{"active": true}},
			})
			var got []any
			for si := range streamSdk.${entity.Name}(nil).Stream("list", nil, nil) {
				if si.Err != nil {
					t.Fatalf("stream failed: %v", si.Err)
				}
				if sub, ok := si.Item.([]any); ok {
					got = append(got, sub...)
				} else {
					got = append(got, si.Item)
				}
			}
			if len(got) != 3 {
				t.Fatalf("expected 3 items via streaming feature, got %d", len(got))
			}
		}
	})
${failureTests(model, entity)}` : ''}${validateTest(model, entity)}
	t.Run("basic", func(tt *testing.T) {
		var t testing.TB = tt
		setup := ${entity.name}BasicSetup(nil)
		// Per-op sdk-test-control.json skip — basic test exercises a flow
		// with multiple ops; skipping any op skips the whole flow.
		_mode := "unit"
		if setup.live {
			_mode = "live"
		}
		for _, _op := range []string{${(Array.from(new Set((allSteps as any[]).map((s: any) => s.o).filter(Boolean)))).map(o => `"${o}"`).join(', ')}} {
			if _shouldSkip, _reason := isControlSkipped("entityOp", "${entity.name}." + _op, _mode); _shouldSkip {
				if _reason == "" {
					_reason = "skipped via sdk-test-control.json"
				}
				t.Skip(_reason)
				return
			}
		}
`)

    const flowBody = (flow: any) => {
      const steps = flowSteps(flow) as any[]
      Content(liveFlowGate(entity, liveFlowNeeds(entity, flow), strict, strictConst,
        PROJUPPER + '_TEST_' + envToken(entity.name) + '_ENTID', steps.length > 0))

      // Check if the flow has a create step; if not, bootstrap entity data
      const flowHasCreate = steps.some((s: any) => s.o === 'create')
      if (!flowHasCreate) {
        const preambleRef = entity.name + '_ref01'
        const preambleVar = goVar(preambleRef)
        Content(`		// Bootstrap entity data from existing test data (no create step in flow).
		${preambleVar}DataRaw := vs.Items(core.ToMapAny(vs.GetPath(setup.data, "existing.${entity.name}")))
		var ${preambleVar}Data map[string]any
		if len(${preambleVar}DataRaw) > 0 {
			${preambleVar}Data = core.ToMapAny(${preambleVar}DataRaw[0][1])
		}
		// Discard guards against Go's unused-var check when the flow's steps
		// happen not to consume the bootstrap data (e.g. list-only flows).
		_ = ${preambleVar}Data

`)
      }

      // Model-driven step iteration
      each(steps, (step: any, index: any) => {
        // Never emit a REMOVE (or its removed-item verify LIST) without a
        // preceding CREATE: a coherent CRUD flow only removes what it created,
        // so a create-less remove would mutate pre-existing (live) data.
        if (!flowHasCreate) {
          if ('remove' === step.o) { return }
          if ('list' === step.o &&
            (step.v || []).some((v: any) => 'ItemNotExists' === v.apply)) { return }
        }
        const opgen: OpGen = GENERATE_OP[step.o]
        if (opgen) {
          opgen({ ...genCtx, flow }, step, index)
          Content('\n')
        }
      })
    }

    const getOnly = liveGetOnly(entity, basicflow)
    if (null != getOnly) {
      Content(`		if setup.live && os.Getenv(${JSON.stringify(LIVE_GETONLY_ENV)}) == "TRUE" {
${liveExcludedLines(getOnly).map((line) => '\t\t\tt.Log(' + JSON.stringify(line) + ')\n').join('')}`)
      if (0 === flowSteps(getOnly.flow).length) {
        Content(`			t.Skip(${JSON.stringify(liveExcludedSummary(getOnly))})
			return
		}

`)
      }
      else {
        flowBody(getOnly.flow)
        Content(`		return
		}

`)
      }
    }

    flowBody(basicflow)

    Content(`	})
}

`)

    // Generate setup function
    Content(`func ${entity.name}BasicSetup(extra map[string]any) *entityTestSetup {
	loadEnvLocal()

	_, filename, _, _ := runtime.Caller(0)
	dir := filepath.Dir(filename)

	entityDataFile := filepath.Join(dir, "..", "..", ".sdk", "test", "entity", "${entity.name}", "${entity.Name}TestData.json")

	entityDataSource, err := os.ReadFile(entityDataFile)
	if err != nil {
		panic("failed to read ${entity.name} test data: " + err.Error())
	}

	var entityData map[string]any
	if err := json.Unmarshal(entityDataSource, &entityData); err != nil {
		panic("failed to parse ${entity.name} test data: " + err.Error())
	}

	options := map[string]any{}
	options["entity"] = entityData["existing"]

	client := sdk.TestSDK(options, extra)

`)

    Content('\t// Generate idmap via transform, matching TS pattern.\n')
    Content('\tidmap, _ := vs.Transform(\n')
    Content('\t\t[]any{' + idnamesStr + '},\n')
    Content('\t\tmap[string]any{\n')
    Content('\t\t\t"`$PACK`": []any{"", map[string]any{\n')
    Content('\t\t\t\t"`$KEY`": "`$COPY`",\n')
    Content('\t\t\t\t"`$VAL`": []any{"`$FORMAT`", "upper", "`$COPY`"},\n')
    Content('\t\t\t}},\n')
    Content('\t\t},\n')
    Content('\t)\n')

    Content(`
	// Whether *_ENTID supplied the idmap, read before envOverride consumes it:
	// without it, the ids a live flow binds are the fixture's synthetic ones.
	entidEnvRaw := os.Getenv("${PROJUPPER}_TEST_${envToken(entity.name)}_ENTID")
	idmapOverridden := entidEnvRaw != "" && strings.HasPrefix(strings.TrimSpace(entidEnvRaw), "{")

	env := envOverride(map[string]any{
		"${PROJUPPER}_TEST_${envToken(entity.name)}_ENTID": idmap,
		"${PROJUPPER}_TEST_LIVE":      "FALSE",
		"${PROJUPPER}_TEST_EXPLAIN":   "FALSE",${apikeyEnvEntry}${serverEnvEntry}
	})

	idmapResolved := core.ToMapAny(env["${PROJUPPER}_TEST_${envToken(entity.name)}_ENTID"])
	if idmapResolved == nil {
		idmapResolved = core.ToMapAny(idmap)
	}
`)

    // Add aliases for ancestor field names
    for (const [key, val] of aliases) {
      Content(`	// Add ${key} alias for update test.
	if idmapResolved["${key}"] == nil {
		idmapResolved["${key}"] = idmapResolved["${val}"]
	}
`)
    }

    Content(`
	if env["${PROJUPPER}_TEST_LIVE"] == "TRUE" {
		// An empty map, not a nil one: Merge returns nil when its last entry
		// is nil, and BasicSetup is normally called with no extras - so a
		// bare nil silently discarded the apikey and server values below.
		extraOpts := extra
		if extraOpts == nil {
			extraOpts = map[string]any{}
		}

		mergedOpts := vs.Merge([]any{
			// liveClientOptions() FIRST, so the generated fields below win:
			// sdk-test-control.json's test.client.options adds to the live
			// client, it does not redirect it.
			liveClientOptions(),
			map[string]any{${apikeyLiveField}${serverLiveField}
			},
			extraOpts,
		})
		client = sdk.New${model.const.Name}SDK(core.ToMapAny(mergedOpts))
	}

	live := env["${PROJUPPER}_TEST_LIVE"] == "TRUE"
	return &entityTestSetup{
		client:        client,
		data:          entityData,
		idmap:         idmapResolved,
		env:           env,
		explain:       env["${PROJUPPER}_TEST_EXPLAIN"] == "TRUE",
		live:          live,
		syntheticOnly: live && !idmapOverridden,
		now:           time.Now().UnixMilli(),
	}
}
`)
  })
})


// The live prologue of a flow built from offline fixtures: blocked without
// the ids it binds, a create-less load reading the first listed record, and
// a lenient run observing its checks rather than failing on them.
function liveFlowGate(entity: any, needs: any, strict: boolean, strictConst: string,
  entidEnv: string, hasSteps: boolean): string {
  let out = ''
  if (0 < needs.keys.length) {
    out += `		if setup.live {
			for _, _liveKey := range []string{${needs.keys.map((k: string) => JSON.stringify(k)).join(', ')}} {
				if setup.syntheticOnly || setup.idmap[_liveKey] == nil {
					liveMiss(t, ${strictConst}, "Live entity test blocked: needs %s via ${entidEnv}", _liveKey)
				}
			}
		}
`
  }
  if (null != needs.blocked) {
    out += `		if setup.live {
			liveMiss(t, ${strictConst}, "Live entity test blocked: %s", ${JSON.stringify(needs.blocked)})
		}
`
  }
  if (hasSteps) {
    // A flow whose every step is skipped (a remove with no data id) uses none.
    out += '\t\tclient := setup.client\n\t\t_ = client\n'
  }
  if (null != needs.discover) {
    const match = Object.entries(needs.discover)
      .map(([k, v]: any) => `${JSON.stringify(k)}: setup.idmap[${JSON.stringify(v)}]`)
      .concat(liveRouteExamples(entity, 'list', Object.keys(needs.discover))
        .map(([k, ex]) => `${JSON.stringify(k)}: ${JSON.stringify(ex)}`)).join(', ')
    out += `		if setup.live {
			liveExisting(t, ${strictConst}, setup.data, ${JSON.stringify(entity.name)}, func() (any, error) {
				return client.${entity.Name}(nil).List(map[string]any{${match}}, nil)
			})
		}
`
  }
  if (!strict) {
    out += `		if setup.live {
			t = liveObserver{tt}
		}
`
  }
  return out + (hasSteps ? '\n' : '')
}


const generateCreate: OpGen = (ctx, step, index) => {
  const { entity, flow } = ctx
  const ref = step.i.ref ?? entity.name + '_ref01'
  const entvar = goVar(step.i.entvar ?? ref + '_ent')
  const datavar = goVar(step.i.datavar ?? (ref + '_data' + (step.i.suffix ?? '')))

  const priorSteps = Object.values(flowSteps(flow)).slice(0, Number(index)) as any[]
  const needsEnt = !priorSteps.some((s: any) =>
    ['create', 'list', 'load', 'update', 'remove'].includes(s.o))

  const hasDatvar = priorSteps.some((s: any) => {
    if ('create' === s.o) {
      const priorRef = s.i.ref ?? entity.name + '_ref01'
      const priorDatvar = goVar(s.i.datavar ?? (priorRef + '_data' + (s.i.suffix ?? '')))
      return priorDatvar === datavar
    }
    return false
  })

  Content(`		// CREATE
`)
  if (needsEnt) {
    Content(`		${entvar} := client.${entity.Name}(nil)
`)
  }

  // Load data from test data file
  if (hasDatvar) {
    Content(`		${datavar} = core.ToMapAny(vs.GetProp(
			vs.GetPath(setup.data, []any{"new", "${entity.name}"}), "${ref}"))
`)
  } else {
    Content(`		${datavar} := core.ToMapAny(vs.GetProp(
			vs.GetPath(setup.data, []any{"new", "${entity.name}"}), "${ref}"))
`)
  }

  // Add match entries
  const matchEntries = getMatchEntries(step)
  for (const [key, val] of matchEntries) {
    Content(`		${datavar}["${key}"] = setup.idmap["${val}"]
`)
  }

  Content(`
		${datavar}Result, err := ${entvar}.Create(${datavar}, nil)
		if err != nil {
			t.Fatalf("create failed: %v", err)
		}
		${datavar} = core.ToMapAny(entityData(${datavar}Result))
		if ${datavar} == nil {
			t.Fatal("expected create result to be a map")
		}
`)
  if (null != ctx.entity.id) {
    Content(`		if ${datavar}["id"] == nil {
			t.Fatal("expected created entity to have an id")
		}
`)
  }
}


const generateList: OpGen = (ctx, step, index) => {
  const { entity, flow } = ctx
  const hasDataId = null != entityDataIdField(entity)
  const ref = step.i.ref ?? entity.name + '_ref01'
  const entvar = goVar(step.i.entvar ?? ref + '_ent')
  const matchvar = goVar(step.i.matchvar ?? (ref + '_match' + (step.i.suffix ?? '')))
  const listvar = goVar(step.i.listvar ?? (ref + '_list' + (step.i.suffix ?? '')))

  const priorSteps = Object.values(flowSteps(flow)).slice(0, Number(index)) as any[]
  const needsEnt = !priorSteps.some((s: any) =>
    ['create', 'list', 'load', 'update', 'remove'].includes(s.o))

  Content(`		// LIST
`)
  if (needsEnt) {
    Content(`		${entvar} := client.${entity.Name}(nil)
`)
  }

  // Generate match map
  const matchEntries = getMatchEntries(step)
  if (matchEntries.length === 0) {
    Content(`		${matchvar} := map[string]any{}
`)
  } else {
    Content(`		${matchvar} := map[string]any{
`)
    for (const [key, val] of matchEntries) {
      Content(`			"${key}": setup.idmap["${val}"],
`)
    }
    Content(`		}
`)
  }
  liveFill(entity, step, matchvar)

  // Only declare ${listvar} as a real var when a downstream validator
  // actually uses it; otherwise `_` to satisfy Go's unused-var check.
  const allSteps = Object.values(flowSteps(flow)) as any[]
  // hasDataId: the ItemExists/ItemNotExists asserts (the only listvar users) are
  // now gated on a real DATA id field, so without one the list result is unused.
  const listvarUsed = hasDataId && !!step.v?.some((v: any) => {
    if ('ItemExists' !== v.apply && 'ItemNotExists' !== v.apply) return false
    const validRef = v.def?.ref
    return validRef && allSteps.some((s: any) => 'create' === s.o &&
      ((s.i.ref ?? entity.name + '_ref01') === validRef))
  })
  const listvarBind = listvarUsed ? listvar : '_'

  // Use a list-step-unique `ok` name; if a prior list emitted plain `ok`,
  // a second `_, ok :=` would be "no new variables on left side of :=".
  const okvar = listvar + 'Ok'
  Content(`
		${listvar}Result, err := ${entvar}.List(${matchvar}, nil)
		if err != nil {
			t.Fatalf("list failed: %v", err)
		}
		${listvarBind}, ${okvar} := ${listvar}Result.([]any)
		if !${okvar} {
			t.Fatalf("expected list result to be an array, got %T", ${listvar}Result)
		}
`)

  // Handle validators from step.v
  if (step.v) {
    for (const validator of step.v) {
      const validRef = validator.def?.ref
      const hasRefData = validRef && allSteps.some((s: any) => 'create' === s.o &&
        ((s.i.ref ?? entity.name + '_ref01') === validRef))

      if ('ItemExists' === validator.apply && hasRefData && hasDataId) {
        const refDataVar = goVar(validRef + '_data')
        Content(`
		foundItem := vs.Select(entityListToData(${listvar}), map[string]any{"id": ${refDataVar}["id"]})
		if vs.IsEmpty(foundItem) {
			t.Fatal("expected to find created entity in list")
		}
`)
      } else if ('ItemNotExists' === validator.apply && hasRefData && hasDataId) {
        const refDataVar = goVar(validRef + '_data')
        Content(`
		notFoundItem := vs.Select(entityListToData(${listvar}), map[string]any{"id": ${refDataVar}["id"]})
		if !vs.IsEmpty(notFoundItem) {
			t.Fatal("expected removed entity to not be in list")
		}
`)
      }
    }
  }
}


const generateUpdate: OpGen = (ctx, step, index) => {
  const { entity, flow } = ctx
  const ref = step.i.ref ?? entity.name + '_ref01'
  const entvar = goVar(step.i.entvar ?? ref + '_ent')
  const datavar = goVar(step.i.datavar ?? (ref + '_data' + (step.i.suffix ?? '')))
  const resdatavar = goVar(step.i.resdatavar ?? (ref + '_resdata' + (step.i.suffix ?? '')))
  const markdefvar = goVar(step.i.markdefvar ?? (ref + '_markdef' + (step.i.suffix ?? '')))
  const srcdatavar = goVar(step.i.srcdatavar ?? (ref + '_data' + (step.i.suffix ?? '')))

  const priorSteps = Object.values(flowSteps(flow)).slice(0, Number(index)) as any[]
  const needsEnt = !priorSteps.some((s: any) =>
    ['create', 'list', 'load', 'update', 'remove'].includes(s.o))

  const hasEntIdU = null != entity.id

  Content(`		// UPDATE
`)
  if (needsEnt) {
    Content(`		${entvar} := client.${entity.Name}(nil)
`)
  }
  Content(`		${datavar}Up := map[string]any{
`)
  if (hasEntIdU) {
    Content(`			"id": ${srcdatavar}["id"],
`)
  }

  // Add data entries from step.d
  if (step.d) {
    const dataEntries = Object.entries(step.d).filter(([k]: any) => k !== 'id' && !k.endsWith('$'))
    for (const [key] of dataEntries) {
      Content(`			"${key}": setup.idmap["${key}"],
`)
    }
  }

  Content(`		}
`)

  // Handle TextFieldMark spec
  if (step.s) {
    for (const spec of step.s) {
      if ('TextFieldMark' === spec.apply && null != step.i.textfield) {
        const fieldname = step.i.textfield
        const fieldvalue = spec.def?.mark ?? `Mark01-${ref}`
        Content(`
		${markdefvar}Name := "${fieldname}"
		${markdefvar}Value := fmt.Sprintf("${fieldvalue}_%d", setup.now)
		${datavar}Up[${markdefvar}Name] = ${markdefvar}Value
`)
      }
    }
  }

  Content(`
		${resdatavar}Result, err := ${entvar}.Update(${datavar}Up, nil)
		if err != nil {
			t.Fatalf("update failed: %v", err)
		}
		${resdatavar} := core.ToMapAny(entityData(${resdatavar}Result))
		if ${resdatavar} == nil {
			t.Fatal("expected update result to be a map")
		}
`)
  if (hasEntIdU) {
    Content(`		if ${resdatavar}["id"] != ${datavar}Up["id"] {
			t.Fatal("expected update result id to match")
		}
`)
  }

  // Assert TextFieldMark
  if (step.s) {
    for (const spec of step.s) {
      if ('TextFieldMark' === spec.apply && null != step.i.textfield) {
        Content(`		if ${resdatavar}[${markdefvar}Name] != ${markdefvar}Value {
			t.Fatalf("expected %s to be updated, got %v", ${markdefvar}Name, ${resdatavar}[${markdefvar}Name])
		}
`)
      }
    }
  }
}


const generateLoad: OpGen = (ctx, step, index) => {
  const { entity, flow } = ctx
  const ref = step.i.ref ?? entity.name + '_ref01'
  const entvar = goVar(step.i.entvar ?? ref + '_ent')
  const matchvar = goVar(step.i.matchvar ?? (ref + '_match' + (step.i.suffix ?? '')))
  const datavar = goVar(step.i.datavar ?? (ref + '_data' + (step.i.suffix ?? '')))
  const srcdatavar = goVar(step.i.srcdatavar ?? (ref + '_data' + (step.i.suffix ?? '')))

  const priorSteps = Object.values(flowSteps(flow)).slice(0, Number(index)) as any[]
  const hasEntVar = priorSteps.some((s: any) =>
    ['create', 'list', 'load', 'update', 'remove'].includes(s.o))

  // Check if srcdatavar was declared by a prior create step or preamble
  const flowHasCreate = Object.values(flowSteps(flow)).some((s: any) => (s as any).o === 'create')
  const preambleRef = entity.name + '_ref01'
  const hasSrcData = (!flowHasCreate && srcdatavar === goVar(preambleRef + '_data')) ||
    priorSteps.some((s: any) => {
      if ('create' === s.o) {
        const priorRef = s.i.ref ?? entity.name + '_ref01'
        const priorDatvar = goVar(s.i.datavar ?? (priorRef + '_data' + (s.i.suffix ?? '')))
        return priorDatvar === srcdatavar
      }
      return false
    })

  const hasEntId = null != entity.id

  Content(`		// LOAD
`)
  if (!hasEntVar) {
    Content(`		${entvar} := client.${entity.Name}(nil)
`)
  }
  if (!hasSrcData && (hasEntId || flowLoadReadsRecord(entity, step))) {
    Content(`		${srcdatavar}Raw := vs.Items(core.ToMapAny(vs.GetPath(setup.data, "existing.${entity.name}")))
		var ${srcdatavar} map[string]any
		if len(${srcdatavar}Raw) > 0 {
			${srcdatavar} = core.ToMapAny(${srcdatavar}Raw[0][1])
		}
`)
  }
  if (hasEntId) {
    Content(`		${matchvar} := map[string]any{
			"id": ${srcdatavar}["id"],
		}
`)
    loadMatch(entity, step, matchvar, srcdatavar)
    liveFill(entity, step, matchvar)
    Content(`		${datavar}Loaded, err := ${entvar}.Load(${matchvar}, nil)
		if err != nil {
			t.Fatalf("load failed: %v", err)
		}
		${datavar}LoadResult := core.ToMapAny(entityData(${datavar}Loaded))
		if ${datavar}LoadResult == nil {
			t.Fatal("expected load result to be a map")
		}
		if ${datavar}LoadResult["id"] != ${srcdatavar}["id"] {
			t.Fatal("expected load result id to match")
		}
`)
  }
  else {
    Content(`		${matchvar} := map[string]any{}
`)
    loadMatch(entity, step, matchvar, srcdatavar)
    liveFill(entity, step, matchvar)
    Content(`		${datavar}Loaded, err := ${entvar}.Load(${matchvar}, nil)
		if err != nil {
			t.Fatalf("load failed: %v", err)
		}
		if ${datavar}Loaded == nil {
			t.Fatal("expected load result to be non-nil")
		}
`)
  }
}


const generateRemove: OpGen = (ctx, step, index) => {
  const { entity, flow } = ctx
  if (null == entityDataIdField(entity)) {
    return
  }
  const ref = step.i.ref ?? entity.name + '_ref01'
  const entvar = goVar(step.i.entvar ?? ref + '_ent')
  const matchvar = goVar(step.i.matchvar ?? (ref + '_match' + (step.i.suffix ?? '')))
  const srcdatavar = goVar(step.i.srcdatavar ?? (ref + '_data'))

  const priorSteps = Object.values(flowSteps(flow)).slice(0, Number(index)) as any[]
  const needsEnt = !priorSteps.some((s: any) =>
    ['create', 'list', 'load', 'update', 'remove'].includes(s.o))

  // Use `:=` when this is the first op step (so `err` gets declared);
  // otherwise reuse the `err` from a prior op step.
  const errOp = needsEnt ? ':=' : '='

  Content(`		// REMOVE
`)
  if (needsEnt) {
    Content(`		${entvar} := client.${entity.Name}(nil)
`)
  }
  // Always match the prior-created entity by id to avoid mock-order flakes.
  Content(`		${matchvar} := map[string]any{
			"id": ${srcdatavar}["id"],
		}
`)
  parentMatch(step, matchvar)
  Content(`		_, err ${errOp} ${entvar}.Remove(${matchvar}, nil)
		if err != nil {
			t.Fatalf("remove failed: %v", err)
		}
`)
}


// A child's route names its parents, and an entity no earlier step has
// filled knows none of them, so the call itself gives each parent id. A live
// ENTID may key a parent by its field name, the fixture by its own name.
// A live step sends each example its route requires and the step leaves unbound.
function liveFill(entity: any, step: any, matchvar: string) {
  const fills = liveStepExamples(entity, step)
  if (0 < fills.length) {
    Content(`		if setup.live {
${fills.map(([k, ex]) => `			${matchvar}[${JSON.stringify(k)}] = ${JSON.stringify(ex)}\n`).join('')}		}
`)
  }
}


function parentMatch(step: any, matchvar: string) {
  const parents = Object.entries(step.m || {})
    .filter(([k]: any) => k !== 'id' && !k.endsWith('$'))
  for (const [key, val] of parents) {
    Content(boundMatch(matchvar, key, [key, val as string], '\t\t'))
  }
}


function boundMatch(matchvar: string, name: string, keys: string[], indent: string): string {
  return 1 === keys.length ? `${indent}${matchvar}["${name}"] = setup.idmap["${keys[0]}"]
` : `${indent}if v := setup.idmap["${keys[0]}"]; v != nil {
${indent}	${matchvar}["${name}"] = v
${indent}} else {
${indent}	${matchvar}["${name}"] = setup.idmap["${keys[1]}"]
${indent}}
`
}


// A load of a known record fills its route from that record, and from the
// step's binding where the record holds no scalar for it. A record only the
// fixture holds replaces the step's binding offline.
function loadMatch(entity: any, step: any, matchvar: string, srcdatavar: string) {
  const route = flowLoadRoute(entity, step)
  if (null == route) {
    return parentMatch(step, matchvar)
  }
  if (route.offline) {
    parentMatch(step, matchvar)
    const own = route.args.filter((arg) => null != arg.field)
    return 0 === own.length ? undefined : Content(`		if !setup.live {
${own.map((arg) => `			switch v := ${srcdatavar}["${arg.field}"].(type) {
			case string, bool, float64, int, int64:
				${matchvar}["${arg.name}"] = v
			}
`).join('')}		}
`)
  }
  for (const arg of route.args) {
    Content(null == arg.field ? boundMatch(matchvar, arg.name, arg.idmap, '\t\t') :
      `		switch v := ${srcdatavar}["${arg.field}"].(type) {
		case string, bool, float64, int, int64:
			${matchvar}["${arg.name}"] = v
		default:
${boundMatch(matchvar, arg.name, arg.idmap, '\t\t\t')}		}
`)
  }
}


const GENERATE_OP: Record<string, OpGen> = {
  create: generateCreate,
  list: generateList,
  update: generateUpdate,
  load: generateLoad,
  remove: generateRemove,
}


// A feature whose PreSpec hook panics, counting the PreUnexpected calls it sees.
function failHookType(entity: ModelEntity): string {
  return `
type ${entity.name}FailHook struct {
	sdk.BaseFeature
	unexpected int
}

func (f *${entity.name}FailHook) PreSpec(ctx *sdk.Context) {
	panic("${entity.name} hook failed")
}

func (f *${entity.name}FailHook) PreUnexpected(ctx *sdk.Context) {
	f.unexpected++
}
`
}


// A failed operation ends a stream with its error as the last value: a
// transport failure, and a hook that rejects the call. A panicking hook
// fires PreUnexpected. The caller's ctrl stays its own.
function failureTests(model: Model, entity: ModelEntity): string {
  const Name = entity.Name
  const SdkError = 'core.' + model.const.Name + 'Error'
  return `
	t.Run("stream-error", func(t *testing.T) {
		offline := map[string]any{"net": map[string]any{"offline": true}}
		var streamerr error
		for si := range sdk.TestSDK(offline, nil).${Name}(nil).Stream("list", nil, nil) {
			if si.Err != nil {
				streamerr = si.Err
			}
		}
		if nil == streamerr || !strings.Contains(streamerr.Error(), "offline") {
			t.Fatalf("expected the transport failure as a stream value, got %v", streamerr)
		}

		quiet := map[string]any{"ctrl": map[string]any{"throw": false}}
		for si := range sdk.TestSDK(offline, nil).${Name}(nil).Stream("list", nil, quiet) {
			if si.Err != nil {
				t.Fatalf("throw false: expected no error value, got %v", si.Err)
			}
		}

		if fhHasFeature("rbac") {
			denied := sdk.TestSDK(nil, map[string]any{
				"feature": map[string]any{"rbac": map[string]any{"active": true, "deny": true}},
			})
			var denyerr error
			for si := range denied.${Name}(nil).Stream("list", nil, nil) {
				if si.Err != nil {
					denyerr = si.Err
				}
			}
			if sdkerr, ok := denyerr.(*${SdkError}); !ok || "rbac_denied" != sdkerr.Code {
				t.Fatalf("expected the rbac denial as a stream value, got %v", denyerr)
			}
		}
	})

	t.Run("stream-ctrl", func(t *testing.T) {
		explain := map[string]any{}
		ctrl := map[string]any{"explain": explain}
		for range sdk.TestSDK(nil, nil).${Name}(nil).Stream("list", nil, map[string]any{"ctrl": ctrl}) {
		}
		if _, has := ctrl["stream"]; has || 1 != len(ctrl) {
			t.Fatalf("the stream changed the caller's ctrl")
		}
		if 0 == len(explain) {
			t.Fatalf("the caller's explain record was not filled")
		}
	})

	t.Run("unexpected", func(t *testing.T) {
		hook := &${entity.name}FailHook{
			BaseFeature: sdk.BaseFeature{Version: "0.0.1", Name: "failhook", Active: true}}
		client := sdk.TestSDK(nil, map[string]any{"extend": []any{hook}})

		_, err := client.${Name}(nil).List(nil, nil)
		if nil == err || !strings.Contains(err.Error(), "hook failed") {
			t.Fatalf("expected the hook's failure, got %v", err)
		}
		if 0 == hook.unexpected {
			t.Fatalf("PreUnexpected did not fire")
		}

		fired := hook.unexpected
		if _, err := client.${Name}(nil).List(nil, map[string]any{"throw": false}); nil != err {
			t.Fatalf("throw false: expected no error, got %v", err)
		}
		if fired == hook.unexpected {
			t.Fatalf("throw false: PreUnexpected did not fire")
		}
	})
`
}


// An invalid request fails with validate's own error, before it is sent.
function validateTest(model: Model, entity: ModelEntity): string {
  const bad = invalidRequest(entity)
  if (null == bad) {
    return ''
  }
  const SdkError = 'core.' + model.const.Name + 'Error'
  const args = Object.entries(bad.args)
    .map(([k, v]) => JSON.stringify(k) + ': ' + JSON.stringify(v)).join(', ')
  return `
	t.Run("validate", func(t *testing.T) {
		if !fhHasFeature("validate") {
			t.Skip("feature not present in this SDK: validate")
		}
		client := sdk.TestSDK(nil, map[string]any{
			"feature": map[string]any{"validate": map[string]any{"active": true}},
		})
		_, err := client.${entity.Name}(nil).${bad.op[0].toUpperCase() + bad.op.slice(1)}(map[string]any{${args}}, nil)
		if sdkerr, ok := err.(*${SdkError}); !ok || "validate_failed" != sdkerr.Code {
			t.Fatalf("expected validate_failed, got %v", err)
		}
	})
`
}


export {
  TestEntity
}
