import { flowSteps, opReachable, validateSeeds } from '@voxgig/sdkgen'

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


// The live prologue of a flow built from offline fixtures: blocked without
// the ids it binds, and a create-less load reading the first listed record.
function liveFlowGate(entity: any, needs: any, entidEnv: string): string {
  let out = ''
  if (0 < needs.keys.length) {
    out += `        if setup["live"]:
            for _live_key in [${needs.keys.map((k: string) => JSON.stringify(k)).join(', ')}]:
                if setup.get("synthetic_only") or setup["idmap"].get(_live_key) is None:
                    runner.live_miss(LIVE_STRICT, f"Live entity test blocked: needs {_live_key} via ${entidEnv}")
`
  }
  if (null != needs.blocked) {
    out += `        if setup["live"]:
            runner.live_miss(LIVE_STRICT, "Live entity test blocked: " + ${JSON.stringify(needs.blocked)})
`
  }
  out += '        client = setup["client"]\n'
  if (null != needs.discover) {
    const match = Object.entries(needs.discover)
      .map(([k, v]: any) => `${JSON.stringify(k)}: setup["idmap"].get(${JSON.stringify(v)})`)
      .concat(liveRouteExamples(entity, 'list', Object.keys(needs.discover))
        .map(([k, ex]) => `${JSON.stringify(k)}: ${pyLit(ex)}`)).join(', ')
    out += `        if setup["live"]:
            runner.live_existing(setup, LIVE_STRICT, ${JSON.stringify(entity.name)},
                                 lambda: client.${entity.Name}(None).list({${match}}, None))
`
  }
  return out
}


// See TestEntity_ts.ts for the GenCtx/OpGen contract.
type GenCtx = {
  model: Model
  entity: ModelEntity
  flow: ModelEntityFlow
  PROJUPPER: string
}

type OpGen = (ctx: GenCtx, step: ModelEntityFlowStep, index: number) => void


const TestEntity = cmp(function TestEntity(props: any) {
  const ctx$ = props.ctx$
  const model: Model = ctx$.model

  const target = props.target
  const entity: ModelEntity = liveEntity(ctx$, props.entity)

  const basicflow: ModelEntityFlow | undefined =
    getModelPath(model, `main.${KIT}.flow.Basic${nom(entity, 'Name')}Flow`)

  // No flow or flow inactive — nothing to generate. The narrowed-form
  // check (rather than `if (!dobasic)`) is what lets TS know `basicflow`
  // is non-null in the rest of the cmp body.
  if (null == basicflow || true !== basicflow.active) {
    return
  }

  const PROJUPPER = envName(model)

  const authActive = isAuthActive(model)
  const apikeyEnvEntry = authActive
    ? `\n        "${PROJUPPER}_APIKEY": "",`
    : ''
  const apikeyLiveField = authActive
    ? `\n                "apikey": env.get("${PROJUPPER}_APIKEY"),`
    : ''

  // A templated server URL (OpenAPI server variables) makes a LIVE client
  // impossible to construct without values: make_options raises rather than
  // request a URL with a literal `{account_id}` in it. Taken from the
  // environment, the same way the apikey is.
  const svars = serverVariables(model)
  const serverEnvEntry = svars
    .map((v: any) => `\n        "${serverVarEnv(PROJUPPER, v.name)}": ${JSON.stringify(v.dflt)},`).join('')
  const serverLiveField = 0 === svars.length ? '' :
    `\n                "server": {` +
    svars.map((v: any) =>
      `\n                    "${v.name}": env.get("${serverVarEnv(PROJUPPER, v.name)}"),`).join('') +
    `\n                },`


  const idnames = buildIdNames(entity, basicflow)
  const idnamesStr = idnames.map(n => `"${n}"`).join(', ')

  const allSteps = Object.values(flowSteps(basicflow)) as any[]
  const updateStep = allSteps.find((s: any) => s.o === 'update')
  const updateData = updateStep?.d
    ? Object.entries(updateStep.d).filter(([k]: any) => k !== 'id' && !k.endsWith('$'))
    : []
  const aliases = updateData.map(([k, v]: any) => [k, v])

  const genCtx: GenCtx = { model, entity, flow: basicflow, PROJUPPER }

  const strict = liveStrict(model, target.name)
  const entidEnv = PROJUPPER + '_TEST_' + envToken(entity.name) + '_ENTID'

  // The stream test streams the "list" op with no match and asserts a 3-item
  // collection, so it only applies to an entity whose list a bare call can
  // reach: not one without a list (e.g. Batch = create/load), not a nested
  // list needing its parent's id, and not one whose routes all need an action.
  const hasList = opReachable((entity.op as any)?.list, [])

  File({ name: 'test_' + entity.name + '_entity.' + target.ext }, () => {

    Content(`# ${entity.Name} entity test

import json
import os
import time

import pytest

from ${model.const.Name.toLowerCase()}_sdk.utility.voxgig_struct import voxgig_struct as vs
from ${model.const.Name.toLowerCase()}_sdk import ${model.const.Name}SDK
from ${model.const.Name.toLowerCase()}_sdk.core import helpers
from ${model.const.Name.toLowerCase()}_sdk.config import shared_config
from ${model.const.Name.toLowerCase()}_sdk.feature.base_feature import ${model.const.Name}BaseFeature

_TEST_DIR = os.path.dirname(os.path.abspath(__file__))
from test import runner
${hasList ? failHookClass(model, entity) : ''}


${liveStrictNote(strict, '#')}
LIVE_STRICT = ${strict ? 'True' : 'False'}


class Test${entity.Name}Entity:

    def test_should_create_instance(self):
        testsdk = ${model.const.Name}SDK.test(None, None)
        ent = testsdk.${entity.Name}(None)
        assert ent is not None
${hasList ? `
    def test_should_stream(self):
        # Feature #4: the entity stream(action, ...) method runs the op
        # pipeline and yields result items. With the streaming feature active
        # it yields the feature's incremental output; otherwise it falls back
        # to the materialised list so stream always yields.
        seed = {
            "entity": {
                "${entity.name}": {
                    "s1": {"id": "s1"},
                    "s2": {"id": "s2"},
                    "s3": {"id": "s3"},
                }
            }
        }

        # Fallback: streaming inactive -> yields the materialised list items.
        base = ${model.const.Name}SDK.test(seed, None)
        seen = list(base.${entity.Name}(None).stream("list", None, None))
        assert len(seen) == 3

        # Inbound: streaming active -> yields each item from the feature.
        from ${model.const.Name.toLowerCase()}_sdk.config import shared_config
        cfg = shared_config()
        if isinstance(cfg.get("feature"), dict) and "streaming" in cfg["feature"]:
            sdk = ${model.const.Name}SDK.test(
                seed, {"feature": {"streaming": {"active": True}}})
            got = []
            for item in sdk.${entity.Name}(None).stream("list", None, None):
                if isinstance(item, list):
                    got.extend(item)
                else:
                    got.append(item)
            assert len(got) == 3
${failureTests(model, entity)}${validateListTest(model, entity)}` : ''}${validateTest(model, entity)}
${strict ? '' : `    @runner.live_observe("${PROJUPPER}_TEST_LIVE", LIVE_STRICT)\n`}    def test_should_run_basic_flow(self):
        setup = _${entity.name}_basic_setup(None)
        # Per-op sdk-test-control.json skip — basic test exercises a flow with
        # multiple ops; skipping any one skips the whole flow (steps depend
        # on each other).
        _live = setup.get("live", False)
        for _op in [${(Array.from(new Set((flowSteps(basicflow) as any[]).map((s: any) => s.o).filter(Boolean)))).map(o => `"${o}"`).join(', ')}]:
            _skip, _reason = runner.is_control_skipped("entityOp", "${entity.name}." + _op, "live" if _live else "unit")
            if _skip:
                pytest.skip(_reason or "skipped via sdk-test-control.json")
                return
`)

    const flowBody = (flow: any) => {
      const steps = flowSteps(flow) as any[]
      Content(liveFlowGate(entity, liveFlowNeeds(entity, flow), entidEnv) + '\n')

      // Check if the flow has a create step
      const flowHasCreate = steps.some((s: any) => s.o === 'create')
      if (!flowHasCreate) {
        Content(`        # Bootstrap entity data from existing test data.
        ${entity.name}_ref01_data_raw = vs.items(helpers.to_map(
            vs.getpath(setup["data"], "existing.${entity.name}")))
        ${entity.name}_ref01_data = None
        if len(${entity.name}_ref01_data_raw) > 0:
            ${entity.name}_ref01_data = helpers.to_map(${entity.name}_ref01_data_raw[0][1])

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

    // A python block cannot hold steps emitted at the method's own indent,
    // so the steps a GET-only run keeps go in a method of their own.
    const getOnly = liveGetOnly(entity, basicflow)
    const getOnlyRuns = null != getOnly && 0 < flowSteps(getOnly.flow).length
    if (null != getOnly) {
      Content(`        if setup["live"] and os.environ.get(${JSON.stringify(LIVE_GETONLY_ENV)}) == "TRUE":
${liveExcludedLines(getOnly).map((line) => '            print(' + pyLit(line) + ')\n').join('')}${getOnlyRuns ?
  '            return self._run_get_only_flow(setup)\n' :
  '            pytest.skip(' + pyLit(liveExcludedSummary(getOnly)) + ')\n'}
`)
    }

    flowBody(basicflow)

    if (null != getOnly && getOnlyRuns) {
      Content(`
    def _run_get_only_flow(self, setup):
`)
      flowBody(getOnly.flow)
    }

    Content(`

def _${entity.name}_basic_setup(extra):
    runner.load_env_local()

    entity_data_file = os.path.join(_TEST_DIR, "../../.sdk/test/entity/${entity.name}/${entity.Name}TestData.json")
    with open(entity_data_file, "r", encoding="utf-8") as f:
        entity_data_source = f.read()

    entity_data = json.loads(entity_data_source)

    options = {}
    options["entity"] = entity_data.get("existing")

    client = ${model.const.Name}SDK.test(options, extra)

`)

    // Generate idmap via vs.transform
    Content(`    # Generate idmap via transform.
    idmap = vs.transform(
        [${idnamesStr}],
        {
            "\`$PACK\`": ["", {
                "\`$KEY\`": "\`$COPY\`",
                "\`$VAL\`": ["\`$FORMAT\`", "upper", "\`$COPY\`"],
            }],
        }
    )

`)

    Content(`    # Whether *_ENTID supplied the idmap, read before env_override consumes
    # it: without it, the ids a live flow binds are the fixture's synthetic ones.
    _entid_env_raw = os.environ.get(
        "${PROJUPPER}_TEST_${envToken(entity.name)}_ENTID")
    _idmap_overridden = _entid_env_raw is not None and _entid_env_raw.strip().startswith("{")

    env = runner.env_override({
        "${PROJUPPER}_TEST_${envToken(entity.name)}_ENTID": idmap,
        "${PROJUPPER}_TEST_LIVE": "FALSE",
        "${PROJUPPER}_TEST_EXPLAIN": "FALSE",${apikeyEnvEntry}${serverEnvEntry}
    })

    idmap_resolved = helpers.to_map(
        env.get("${PROJUPPER}_TEST_${envToken(entity.name)}_ENTID"))
    if idmap_resolved is None:
        idmap_resolved = helpers.to_map(idmap)
`)

    // Add aliases
    for (const [key, val] of aliases) {
      Content(`    if idmap_resolved.get("${key}") is None:
        idmap_resolved["${key}"] = idmap_resolved.get("${val}")
`)
    }

    Content(`
    if env.get("${PROJUPPER}_TEST_LIVE") == "TRUE":
        merged_opts = vs.merge([
            # FIRST, so the generated fields below win: sdk-test-control.json's
            # test.client.options adds to the live client, it does not
            # redirect it.
            runner.live_client_options(),
            {${apikeyLiveField}${serverLiveField}
            },
            extra or {},
        ])
        client = ${model.const.Name}SDK(helpers.to_map(merged_opts))

    _live = env.get("${PROJUPPER}_TEST_LIVE") == "TRUE"
    return {
        "client": client,
        "data": entity_data,
        "idmap": idmap_resolved,
        "env": env,
        "explain": env.get("${PROJUPPER}_TEST_EXPLAIN") == "TRUE",
        "live": _live,
        "synthetic_only": _live and not _idmap_overridden,
        "now": int(time.time() * 1000),
    }
`)
  })
})


const generateCreate: OpGen = (ctx, step, index) => {
  const { entity, flow } = ctx
  const ref = step.i.ref ?? entity.name + '_ref01'
  const entvar = step.i.entvar ?? ref + '_ent'
  const datavar = step.i.datavar ?? (ref + '_data' + (step.i.suffix ?? ''))

  const priorSteps = Object.values(flowSteps(flow)).slice(0, Number(index)) as any[]
  const needsEnt = !priorSteps.some((s: any) =>
    ['create', 'list', 'load', 'update', 'remove'].includes(s.o))

  const hasDatvar = priorSteps.some((s: any) => {
    if ('create' === s.o) {
      const priorRef = s.i.ref ?? entity.name + '_ref01'
      const priorDatvar = s.i.datavar ?? (priorRef + '_data' + (s.i.suffix ?? ''))
      return priorDatvar === datavar
    }
    return false
  })

  Content(`        # CREATE
`)
  if (needsEnt) {
    Content(`        ${entvar} = client.${entity.Name}(None)
`)
  }

  if (hasDatvar) {
    Content(`        ${datavar} = helpers.to_map(vs.getprop(
            vs.getpath(setup["data"], "new.${entity.name}"), "${ref}"))
`)
  } else {
    Content(`        ${datavar} = helpers.to_map(vs.getprop(
            vs.getpath(setup["data"], "new.${entity.name}"), "${ref}"))
`)
  }

  const matchEntries = getMatchEntries(step)
  for (const [key, val] of matchEntries) {
    Content(`        ${datavar}["${key}"] = setup["idmap"]["${val}"]
`)
  }

  const hasEntIdC = null != ctx.entity.id

  Content(`
        ${datavar} = helpers.to_map(runner.entity_data(${entvar}.create(${datavar}, None)))
        assert ${datavar} is not None
`)
  if (hasEntIdC) {
    Content(`        assert ${datavar}["id"] is not None
`)
  }
}


const generateList: OpGen = (ctx, step, index) => {
  const { entity, flow } = ctx
  const hasDataId = null != entityDataIdField(entity)
  const ref = step.i.ref ?? entity.name + '_ref01'
  const entvar = step.i.entvar ?? ref + '_ent'
  const matchvar = step.i.matchvar ?? (ref + '_match' + (step.i.suffix ?? ''))
  const listvar = step.i.listvar ?? (ref + '_list' + (step.i.suffix ?? ''))

  const priorSteps = Object.values(flowSteps(flow)).slice(0, Number(index)) as any[]
  const needsEnt = !priorSteps.some((s: any) =>
    ['create', 'list', 'load', 'update', 'remove'].includes(s.o))

  Content(`        # LIST
`)
  if (needsEnt) {
    Content(`        ${entvar} = client.${entity.Name}(None)
`)
  }

  const matchEntries = getMatchEntries(step)
  if (matchEntries.length === 0) {
    Content(`        ${matchvar} = {}
`)
  } else {
    Content(`        ${matchvar} = {
`)
    for (const [key, val] of matchEntries) {
      Content(`            "${key}": setup["idmap"]["${val}"],
`)
    }
    Content(`        }
`)
  }
  Content(liveFill(entity, step, matchvar))

  Content(`
        ${listvar}_result = ${entvar}.list(${matchvar}, None)
        assert isinstance(${listvar}_result, list)
`)

  // Handle validators
  const allSteps = Object.values(flowSteps(flow)) as any[]
  if (step.v) {
    for (const validator of step.v) {
      const validRef = validator.def?.ref
      const hasRefData = validRef && allSteps.some((s: any) => 'create' === s.o &&
        ((s.i.ref ?? entity.name + '_ref01') === validRef))

      if ('ItemExists' === validator.apply && hasRefData && hasDataId) {
        const refDataVar = validRef + '_data'
        Content(`
        found_item = vs.select(
            runner.entity_list_to_data(${listvar}_result),
            {"id": ${refDataVar}["id"]})
        assert not vs.isempty(found_item)
`)
      } else if ('ItemNotExists' === validator.apply && hasRefData && hasDataId) {
        const refDataVar = validRef + '_data'
        Content(`
        not_found_item = vs.select(
            runner.entity_list_to_data(${listvar}_result),
            {"id": ${refDataVar}["id"]})
        assert vs.isempty(not_found_item)
`)
      }
    }
  }
}


const generateUpdate: OpGen = (ctx, step, index) => {
  const { entity, flow } = ctx
  const ref = step.i.ref ?? entity.name + '_ref01'
  const entvar = step.i.entvar ?? ref + '_ent'
  const datavar = step.i.datavar ?? (ref + '_data' + (step.i.suffix ?? ''))
  const resdatavar = step.i.resdatavar ?? (ref + '_resdata' + (step.i.suffix ?? ''))
  const markdefvar = step.i.markdefvar ?? (ref + '_markdef' + (step.i.suffix ?? ''))
  const srcdatavar = step.i.srcdatavar ?? (ref + '_data' + (step.i.suffix ?? ''))

  const priorSteps = Object.values(flowSteps(flow)).slice(0, Number(index)) as any[]
  const needsEnt = !priorSteps.some((s: any) =>
    ['create', 'list', 'load', 'update', 'remove'].includes(s.o))

  const hasEntIdU = null != entity.id

  Content(`        # UPDATE
`)
  if (needsEnt) {
    Content(`        ${entvar} = client.${entity.Name}(None)
`)
  }
  Content(`        ${datavar}_up = {
`)
  if (hasEntIdU) {
    Content(`            "id": ${srcdatavar}["id"],
`)
  }

  if (step.d) {
    const dataEntries = Object.entries(step.d).filter(([k]: any) => k !== 'id' && !k.endsWith('$'))
    for (const [key] of dataEntries) {
      Content(`            "${key}": setup["idmap"]["${key}"],
`)
    }
  }

  Content(`        }
`)

  if (step.s) {
    for (const spec of step.s) {
      if ('TextFieldMark' === spec.apply && null != step.i.textfield) {
        const fieldname = step.i.textfield
        const fieldvalue = spec.def?.mark ?? `Mark01-${ref}`
        Content(`
        ${markdefvar}_name = "${fieldname}"
        ${markdefvar}_value = "${fieldvalue}_" + str(setup["now"])
        ${datavar}_up[${markdefvar}_name] = ${markdefvar}_value
`)
      }
    }
  }

  Content(`
        ${resdatavar} = helpers.to_map(runner.entity_data(${entvar}.update(${datavar}_up, None)))
        assert ${resdatavar} is not None
`)
  if (hasEntIdU) {
    Content(`        assert ${resdatavar}["id"] == ${datavar}_up["id"]
`)
  }

  if (step.s) {
    for (const spec of step.s) {
      if ('TextFieldMark' === spec.apply && null != step.i.textfield) {
        Content(`        assert ${resdatavar}[${markdefvar}_name] == ${markdefvar}_value
`)
      }
    }
  }
}


const generateLoad: OpGen = (ctx, step, index) => {
  const { entity, flow } = ctx
  const ref = step.i.ref ?? entity.name + '_ref01'
  const entvar = step.i.entvar ?? ref + '_ent'
  const matchvar = step.i.matchvar ?? (ref + '_match' + (step.i.suffix ?? ''))
  const datavar = step.i.datavar ?? (ref + '_data' + (step.i.suffix ?? ''))
  const srcdatavar = step.i.srcdatavar ?? (ref + '_data' + (step.i.suffix ?? ''))

  const priorSteps = Object.values(flowSteps(flow)).slice(0, Number(index)) as any[]
  const hasEntVar = priorSteps.some((s: any) =>
    ['create', 'list', 'load', 'update', 'remove'].includes(s.o))

  const flowHasCreate = Object.values(flowSteps(flow)).some((s: any) => (s as any).o === 'create')
  const preambleRef = entity.name + '_ref01'
  const hasSrcData = (!flowHasCreate && srcdatavar === (preambleRef + '_data')) ||
    priorSteps.some((s: any) => {
      if ('create' === s.o) {
        const priorRef = s.i.ref ?? entity.name + '_ref01'
        const priorDatvar = s.i.datavar ?? (priorRef + '_data' + (s.i.suffix ?? ''))
        return priorDatvar === srcdatavar
      }
      return false
    })

  const hasEntId = null != entity.id

  Content(`        # LOAD
`)
  if (!hasEntVar) {
    Content(`        ${entvar} = client.${entity.Name}(None)
`)
  }
  if (!hasSrcData && (hasEntId || flowLoadReadsRecord(entity, step))) {
    Content(`        ${srcdatavar}_raw = vs.items(helpers.to_map(
            vs.getpath(setup["data"], "existing.${entity.name}")))
        ${srcdatavar} = None
        if len(${srcdatavar}_raw) > 0:
            ${srcdatavar} = helpers.to_map(${srcdatavar}_raw[0][1])
`)
  }
  if (hasEntId) {
    Content(`        ${matchvar} = {
            "id": ${srcdatavar}["id"],
        }
${loadMatch(entity, step, matchvar, srcdatavar)}${liveFill(entity, step, matchvar)}        ${datavar}_loaded = ${entvar}.load(${matchvar}, None)
        ${datavar}_load_result = helpers.to_map(runner.entity_data(${datavar}_loaded))
        assert ${datavar}_load_result is not None
        assert ${datavar}_load_result["id"] == ${srcdatavar}["id"]
`)
  }
  else {
    Content(`        ${matchvar} = {}
${loadMatch(entity, step, matchvar, srcdatavar)}${liveFill(entity, step, matchvar)}        ${datavar}_loaded = ${entvar}.load(${matchvar}, None)
        assert ${datavar}_loaded is not None
`)
  }
}


const generateRemove: OpGen = (ctx, step, index) => {
  const { entity, flow } = ctx
  if (null == entityDataIdField(entity)) {
    return
  }
  const ref = step.i.ref ?? entity.name + '_ref01'
  const entvar = step.i.entvar ?? ref + '_ent'
  const matchvar = step.i.matchvar ?? (ref + '_match' + (step.i.suffix ?? ''))
  const srcdatavar = step.i.srcdatavar ?? (ref + '_data')

  const priorSteps = Object.values(flowSteps(flow)).slice(0, Number(index)) as any[]
  const needsEnt = !priorSteps.some((s: any) =>
    ['create', 'list', 'load', 'update', 'remove'].includes(s.o))

  Content(`        # REMOVE
`)
  if (needsEnt) {
    Content(`        ${entvar} = client.${entity.Name}(None)
`)
  }
  // Always match the prior-created entity by id to avoid mock-order flakes.
  Content(`        ${matchvar} = {
            "id": ${srcdatavar}["id"],
        }
${parentMatch(step, matchvar)}        ${entvar}.remove(${matchvar}, None)
`)
}



// A child's route names its parents, and an entity no earlier step has
// filled knows none of them, so the call itself gives each parent id. A live
// ENTID may key a parent by its field name, the fixture by its own name.
// A live step sends each example its route requires and the step leaves unbound.
function liveFill(entity: any, step: any, matchvar: string): string {
  const fills = liveStepExamples(entity, step)
  return 0 === fills.length ? '' : `        if setup["live"]:
${fills.map(([k, ex]) => `            ${matchvar}[${JSON.stringify(k)}] = ${pyLit(ex)}\n`).join('')}`
}


function parentMatch(step: any, matchvar: string): string {
  return Object.entries(step.m || {})
    .filter(([k]: any) => k !== 'id' && !k.endsWith('$'))
    .map(([key, val]: any) => `        ${matchvar}["${key}"] = setup["idmap"].get("${key}") or setup["idmap"].get("${val}")
`).join('')
}

// A load of a known record fills its route from that record, and from the
// step's binding where the record holds no scalar for it. A record only the
// fixture holds replaces the step's binding offline.
function loadMatch(entity: any, step: any, matchvar: string, srcdatavar: string): string {
  const route = flowLoadRoute(entity, step)
  if (null == route) {
    return parentMatch(step, matchvar)
  }
  if (route.offline) {
    const own = route.args.filter((arg) => null != arg.field)
    return parentMatch(step, matchvar) + (0 === own.length ? '' : `        if not setup["live"]:
${own.map((arg) => `            if isinstance(${srcdatavar}.get("${arg.field}"), (str, int, float)):
                ${matchvar}["${arg.name}"] = ${srcdatavar}["${arg.field}"]
`).join('')}`)
  }
  return route.args.map((arg) => {
    const bound = arg.idmap.map((key) => `setup["idmap"].get("${key}")`).join(' or ')
    const own = `${srcdatavar}.get("${arg.field}")`
    return `        ${matchvar}["${arg.name}"] = ${null == arg.field ? bound :
      `${own} if isinstance(${own}, (str, int, float)) else ${bound}`}
`
  }).join('')
}


const GENERATE_OP: Record<string, OpGen> = {
  create: generateCreate,
  list: generateList,
  update: generateUpdate,
  load: generateLoad,
  remove: generateRemove,
}


// A feature whose PreSpec hook raises, counting the PreUnexpected calls it sees.
function failHookClass(model: Model, entity: ModelEntity): string {
  return `

class _FailHook(${model.const.Name}BaseFeature):
    def __init__(self):
        super().__init__()
        self.name = "failhook"
        self.unexpected = 0

    def init(self, ctx, options):
        pass

    def PreSpec(self, ctx):
        raise RuntimeError("${entity.name} hook failed")

    def PreUnexpected(self, ctx):
        self.unexpected += 1
`
}


// A failed operation raises from a stream as it does from the operation: a
// transport failure, and a hook that rejects the call. A raising hook fires
// PreUnexpected. The caller's ctrl stays its own.
function failureTests(model: Model, entity: ModelEntity): string {
  const Name = model.const.Name
  const Entity = entity.Name
  return `
    def test_should_report_a_failed_stream(self):
        offline = {"net": {"offline": True}}
        with pytest.raises(Exception, match="offline"):
            list(${Name}SDK.test(offline, None).${Entity}(None).stream("list", None, None))

        quiet = {"ctrl": {"throw": False}}
        list(${Name}SDK.test(offline, None).${Entity}(None).stream("list", None, quiet))

        if "rbac" in (shared_config().get("feature") or {}):
            denied = ${Name}SDK.test(
                None, {"feature": {"rbac": {"active": True, "deny": True}}})
            with pytest.raises(Exception) as err:
                list(denied.${Entity}(None).stream("list", None, None))
            assert "rbac_denied" == getattr(err.value, "code", None)

    def test_should_leave_the_callers_ctrl(self):
        explain = {}
        ctrl = {"explain": explain}
        list(${Name}SDK.test(None, None).${Entity}(None).stream("list", None, {"ctrl": ctrl}))
        assert ["explain"] == list(ctrl.keys())
        assert explain is ctrl["explain"] and 0 < len(explain)

    def test_should_fire_pre_unexpected(self):
        hook = _FailHook()
        client = ${Name}SDK({"feature": {"test": {"active": True}}, "extend": [hook]})
        with pytest.raises(Exception, match="hook failed"):
            client.${Entity}(None).list(None, None)
        assert 0 < hook.unexpected

        fired = hook.unexpected
        assert client.${Entity}(None).list(None, {"throw": False}) is None
        assert fired < hook.unexpected
`
}


// An invalid request fails with validate's own error, before it is sent.
function validateTest(model: Model, entity: ModelEntity): string {
  const bad = invalidRequest(entity)
  if (null == bad) {
    return ''
  }
  const args = Object.entries(bad.args)
    .map(([k, v]) => JSON.stringify(k) + ': ' + pyLit(v)).join(', ')
  return `
    def test_should_refuse_an_invalid_request(self):
        if "validate" not in (shared_config().get("feature") or {}):
            pytest.skip("feature not present in this SDK: validate")
        client = ${model.const.Name}SDK.test(
            None, {"feature": {"validate": {"active": True}}})
        with pytest.raises(Exception) as err:
            client.${entity.Name}(None).${bad.op}({${args}}, None)
        assert "validate_failed" == getattr(err.value, "code", None)
`
}


// A list response is checked record by record, not entity by entity.
function validateListTest(model: Model, entity: ModelEntity): string {
  const seeds = validateSeeds(entity)
  if (null == seeds) {
    return ''
  }
  const SDK = model.const.Name + 'SDK'
  const seed = (rec: Record<string, any>) =>
    '{"entity": {' + JSON.stringify(entity.name) + ': {"v1": {' +
    Object.entries(rec).map(([k, v]) => JSON.stringify(k) + ': ' + pyLit(v)).join(', ') + '}}}}'
  return `
    def test_should_validate_each_listed_record(self):
        if "validate" not in (shared_config().get("feature") or {}):
            pytest.skip("feature not present in this SDK: validate")
        opts = {"feature": {"validate": {"active": True, "request": False, "response": True}}}
        listed = ${SDK}.test(${seed(seeds.valid)}, opts).${entity.Name}(None).list(None, None)
        assert ["v1"] == [ent.data_get().get("id") for ent in listed]
${null == seeds.invalid ? '' : `        with pytest.raises(Exception) as err:
            ${SDK}.test(${seed(seeds.invalid)}, opts).${entity.Name}(None).list(None, None)
        assert "validate_failed" == getattr(err.value, "code", None)
`}`
}


function pyLit(v: any): string {
  return true === v ? 'True' : false === v ? 'False' : JSON.stringify(v)
}


export {
  TestEntity
}
