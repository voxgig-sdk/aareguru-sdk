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
  entityDataIdField, envName, envToken,
  serverVarEnv,
  serverVariables,
  invalidRequest,
  liveFlowNeeds, liveStrict, liveStrictNote,
  liveRouteExamples, liveStepExamples, flowLoadRoute, flowLoadReadsRecord,
  liveGetOnly, liveExcludedLines, liveExcludedSummary, LIVE_GETONLY_ENV,
  liveEntity,
} from '@voxgig/sdkgen'

import { formatLuaValue } from './utility_lua'


// See TestEntity_ts.ts for the GenCtx/OpGen contract.
type GenCtx = {
  model: Model
  entity: ModelEntity
  flow: ModelEntityFlow
  PROJUPPER: string
}

type OpGen = (ctx: GenCtx, step: ModelEntityFlowStep, index: number) => void


// The live prologue of a flow built from offline fixtures: blocked without
// the ids it binds, a create-less load reading the first listed record, and
// a lenient run observing its checks rather than failing on them.
function liveFlowGate(entity: any, needs: any, entidEnv: string, strict: boolean): string {
  let out = ''
  if (0 < needs.keys.length) {
    out += `    if setup.live then
      for _, _live_key in ipairs({${needs.keys.map((k: string) => JSON.stringify(k)).join(', ')}}) do
        if setup.synthetic_only or setup.idmap[_live_key] == nil then
          runner.live_miss(pending, LIVE_STRICT, "Live entity test blocked: needs " .. _live_key .. " via ${entidEnv}")
        end
      end
    end
`
  }
  if (null != needs.blocked) {
    out += `    if setup.live then
      runner.live_miss(pending, LIVE_STRICT, "Live entity test blocked: " .. ${JSON.stringify(needs.blocked)})
    end
`
  }
  out += '    local client = setup.client\n'
  if (null != needs.discover) {
    const match = Object.entries(needs.discover)
      .map(([k, v]: any) => `[${JSON.stringify(k)}] = setup.idmap[${JSON.stringify(v)}]`)
      .concat(liveRouteExamples(entity, 'list', Object.keys(needs.discover))
        .map(([k, ex]) => `[${JSON.stringify(k)}] = ${formatLuaValue(ex)}`)).join(', ')
    out += `    if setup.live then
      runner.live_existing(pending, setup, LIVE_STRICT, ${JSON.stringify(entity.name)}, function()
        return client:${entity.Name}(nil):list({${match}}, nil)
      end)
    end
`
  }
  if (!strict) {
    out += '    local _live_ok, _live_err = pcall(function()\n'
  }
  return out
}


const TestEntity = cmp(function TestEntity(props: any) {
  const ctx$ = props.ctx$
  const model: Model = ctx$.model

  const target = props.target
  const entity: ModelEntity = liveEntity(ctx$, props.entity)

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
    ? `\n    ["${PROJUPPER}_APIKEY"] = "",`
    : ''
  const apikeyLiveField = authActive
    ? `\n        apikey = env["${PROJUPPER}_APIKEY"],`
    : ''

  // A templated server URL (OpenAPI server variables) makes a LIVE client
  // impossible to construct without values: makeOptions raises rather than
  // request a URL with a literal `{account_id}` in it. So the live suite
  // takes them from the environment the same way it takes the apikey.
  const svars = serverVariables(model)
  const serverEnvEntry = svars
    .map((v: any) => `\n    ["${serverVarEnv(PROJUPPER, v.name)}"] = ${formatLuaValue(v.dflt)},`).join('')
  const serverLiveField = 0 === svars.length ? '' : `
        server = {${svars
      .map((v: any) => `
          ["${v.name}"] = env["${serverVarEnv(PROJUPPER, v.name)}"],`).join('')}
        },`

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

  File({ name: entity.name + '_entity_test.' + target.ext }, () => {

    Content(`-- ${entity.Name} entity test

local json = require("dkjson")
local vs = require("utility.struct.struct")
local sdk = require("${model.name}_sdk")
local helpers = require("core.helpers")
local runner = require("test.runner")

local _test_dir = debug.getinfo(1, "S").source:match("^@(.+/)")  or "./"

${liveStrictNote(strict, '--')}
local LIVE_STRICT = ${strict}

${hasList ? failHookClass(entity) : ''}
describe("${entity.Name}Entity", function()
  it("should create instance", function()
    local testsdk = sdk.test(nil, nil)
    local ent = testsdk:${entity.Name}(nil)
    assert.is_not_nil(ent)
  end)
${hasList ? `
  -- Feature #4: the entity stream(action, ...) method runs the op pipeline and
  -- returns an iterator over result items. With the streaming feature active it
  -- yields the feature's incremental output; otherwise it falls back to the
  -- materialised list so stream always yields.
  it("should stream", function()
    local seed = {
      entity = {
        ["${entity.name}"] = {
          s1 = { id = "s1" },
          s2 = { id = "s2" },
          s3 = { id = "s3" },
        },
      },
    }

    -- Fallback: streaming inactive -> yields the materialised list items.
    local base = sdk.test(seed, nil)
    local seen = {}
    for item in base:${entity.Name}(nil):stream("list", nil, nil) do
      table.insert(seen, item)
    end
    assert.are.equal(3, #seen)

    -- Inbound: streaming active -> yields each item from the feature.
    local config = require("config_shared")()
    if type(config.feature) == "table" and config.feature.streaming ~= nil then
      local streamsdk = sdk.test(seed, { feature = { streaming = { active = true } } })
      local got = {}
      for item in streamsdk:${entity.Name}(nil):stream("list", nil, nil) do
        if vs.islist(item) then
          for _, sub in ipairs(item) do
            table.insert(got, sub)
          end
        else
          table.insert(got, item)
        end
      end
      assert.are.equal(3, #got)
    end
  end)
${failureTests(entity)}` : ''}${validateTest(entity)}
  it("should run basic flow", function()
    local setup = ${entity.name}_basic_setup(nil)
    -- Per-op sdk-test-control.json skip.
    local _live = setup.live or false
    for _, _op in ipairs({${(Array.from(new Set((allSteps as any[]).map((s: any) => s.o).filter(Boolean)))).map(o => `"${o}"`).join(', ')}}) do
      local _should_skip, _reason = runner.is_control_skipped("entityOp", "${entity.name}." .. _op, _live and "live" or "unit")
      if _should_skip then
        pending(_reason or "skipped via sdk-test-control.json")
        return
      end
    end
`)

    const flowBody = (flow: any) => {
      const steps = flowSteps(flow) as any[]
      Content(liveFlowGate(entity, liveFlowNeeds(entity, flow), entidEnv, strict) + '\n')

      // Check if the flow has a create step
      const flowHasCreate = steps.some((s: any) => s.o === 'create')
      if (!flowHasCreate) {
        Content(`    -- Bootstrap entity data from existing test data.
    local ${entity.name}_ref01_data_raw = vs.items(helpers.to_map(
      vs.getpath(setup.data, "existing.${entity.name}")))
    local ${entity.name}_ref01_data = nil
    if #${entity.name}_ref01_data_raw > 0 then
      ${entity.name}_ref01_data = helpers.to_map(${entity.name}_ref01_data_raw[1][2])
    end

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

      Content(strict ? '' : `    end)
    if not _live_ok then
      runner.live_observe(pending, _live_err, setup, LIVE_STRICT)
    end
`)
    }

    const getOnly = liveGetOnly(entity, basicflow)
    if (null != getOnly) {
      Content(`    if setup.live and os.getenv(${formatLuaValue(LIVE_GETONLY_ENV)}) == "TRUE" then
${liveExcludedLines(getOnly).map((line) => '      print(' + formatLuaValue(line) + ')\n').join('')}`)
      if (0 === flowSteps(getOnly.flow).length) {
        Content(`      pending(${formatLuaValue(liveExcludedSummary(getOnly))})
      return
    end

`)
      }
      else {
        flowBody(getOnly.flow)
        Content(`      return
    end

`)
      }
    }

    flowBody(basicflow)

    Content(`  end)
end)

`)

    // Generate setup function
    Content(`function ${entity.name}_basic_setup(extra)
  runner.load_env_local()

  local entity_data_file = _test_dir .. "../../.sdk/test/entity/${entity.name}/${entity.Name}TestData.json"
  local f = io.open(entity_data_file, "r")
  if f == nil then
    error("failed to read ${entity.name} test data: " .. entity_data_file)
  end
  local entity_data_source = f:read("*a")
  f:close()

  local entity_data = json.decode(entity_data_source)

  local options = {}
  options["entity"] = entity_data["existing"]

  local client = sdk.test(options, extra)

`)

    // Generate idmap via vs.transform
    Content(`  -- Generate idmap via transform.
  local idmap = vs.transform(
    { ${idnamesStr} },
    {
      ["\`$PACK\`"] = { "", {
        ["\`$KEY\`"] = "\`$COPY\`",
        ["\`$VAL\`"] = { "\`$FORMAT\`", "upper", "\`$COPY\`" },
      }},
    }
  )

`)

    Content(`  -- Whether *_ENTID supplied the idmap, read before env_override consumes
  -- it: without it, the ids a live flow binds are the fixture's synthetic ones.
  local entid_env_raw = os.getenv("${PROJUPPER}_TEST_${envToken(entity.name)}_ENTID")
  local idmap_overridden = entid_env_raw ~= nil and entid_env_raw:match("^%s*{") ~= nil

  local env = runner.env_override({
    ["${PROJUPPER}_TEST_${envToken(entity.name)}_ENTID"] = idmap,
    ["${PROJUPPER}_TEST_LIVE"] = "FALSE",
    ["${PROJUPPER}_TEST_EXPLAIN"] = "FALSE",${apikeyEnvEntry}${serverEnvEntry}
  })

  local idmap_resolved = helpers.to_map(
    env["${PROJUPPER}_TEST_${envToken(entity.name)}_ENTID"])
  if idmap_resolved == nil then
    idmap_resolved = helpers.to_map(idmap)
  end
`)

    // Add aliases
    for (const [key, val] of aliases) {
      Content(`  if idmap_resolved["${key}"] == nil then
    idmap_resolved["${key}"] = idmap_resolved["${val}"]
  end
`)
    }

    Content(`
  if env["${PROJUPPER}_TEST_LIVE"] == "TRUE" then
    local merged_opts = vs.merge({
      -- FIRST, so the generated fields below win: sdk-test-control.json's
      -- test.client.options adds to the live client, it does not redirect it.
      runner.live_client_options(),
      {${apikeyLiveField}${serverLiveField}
      },
      extra or {},
    })
    client = sdk.new(helpers.to_map(merged_opts))
  end

  local live = env["${PROJUPPER}_TEST_LIVE"] == "TRUE"
  return {
    client = client,
    data = entity_data,
    idmap = idmap_resolved,
    env = env,
    explain = env["${PROJUPPER}_TEST_EXPLAIN"] == "TRUE",
    live = live,
    synthetic_only = live and not idmap_overridden,
    now = os.time() * 1000,
  }
end
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

  Content(`    -- CREATE
`)
  if (needsEnt) {
    Content(`    local ${entvar} = client:${entity.Name}(nil)
`)
  }

  if (hasDatvar) {
    Content(`    ${datavar} = helpers.to_map(vs.getprop(
      vs.getpath(setup.data, "new.${entity.name}"), "${ref}"))
`)
  } else {
    Content(`    local ${datavar} = helpers.to_map(vs.getprop(
      vs.getpath(setup.data, "new.${entity.name}"), "${ref}"))
`)
  }

  const matchEntries = getMatchEntries(step)
  for (const [key, val] of matchEntries) {
    Content(`    ${datavar}["${key}"] = setup.idmap["${val}"]
`)
  }

  Content(`
    local ${datavar}_result, err = ${entvar}:create(${datavar}, nil)
    assert.is_nil(err)
    ${datavar} = helpers.to_map(type(${datavar}_result) == 'table' and ${datavar}_result.data_get and ${datavar}_result:data_get() or ${datavar}_result)
    assert.is_not_nil(${datavar})
`)
  if (null != ctx.entity.id) {
    Content(`    assert.is_not_nil(${datavar}["id"])
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

  Content(`    -- LIST
`)
  if (needsEnt) {
    Content(`    local ${entvar} = client:${entity.Name}(nil)
`)
  }

  const matchEntries = getMatchEntries(step)
  if (matchEntries.length === 0) {
    Content(`    local ${matchvar} = {}
`)
  } else {
    Content(`    local ${matchvar} = {
`)
    for (const [key, val] of matchEntries) {
      Content(`      ["${key}"] = setup.idmap["${val}"],
`)
    }
    Content(`    }
`)
  }
  Content(liveFill(entity, step, matchvar))

  Content(`
    local ${listvar}_result, err = ${entvar}:list(${matchvar}, nil)
    assert.is_nil(err)
    assert.is_table(${listvar}_result)
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
    local found_item = vs.select(
      runner.entity_list_to_data(${listvar}_result),
      { id = ${refDataVar}["id"] })
    assert.is_false(vs.isempty(found_item))
`)
      } else if ('ItemNotExists' === validator.apply && hasRefData && hasDataId) {
        const refDataVar = validRef + '_data'
        Content(`
    local not_found_item = vs.select(
      runner.entity_list_to_data(${listvar}_result),
      { id = ${refDataVar}["id"] })
    assert.is_true(vs.isempty(not_found_item))
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

  Content(`    -- UPDATE
`)
  if (needsEnt) {
    Content(`    local ${entvar} = client:${entity.Name}(nil)
`)
  }
  Content(`    local ${datavar}_up = {
`)
  if (hasEntIdU) {
    Content(`      id = ${srcdatavar}["id"],
`)
  }

  if (step.d) {
    const dataEntries = Object.entries(step.d).filter(([k]: any) => k !== 'id' && !k.endsWith('$'))
    for (const [key] of dataEntries) {
      Content(`      ["${key}"] = setup.idmap["${key}"],
`)
    }
  }

  Content(`    }
`)

  if (step.s) {
    for (const spec of step.s) {
      if ('TextFieldMark' === spec.apply && null != step.i.textfield) {
        const fieldname = step.i.textfield
        const fieldvalue = spec.def?.mark ?? `Mark01-${ref}`
        Content(`
    local ${markdefvar}_name = "${fieldname}"
    local ${markdefvar}_value = "${fieldvalue}_" .. tostring(setup.now)
    ${datavar}_up[${markdefvar}_name] = ${markdefvar}_value
`)
      }
    }
  }

  Content(`
    local ${resdatavar}_result, err = ${entvar}:update(${datavar}_up, nil)
    assert.is_nil(err)
    local ${resdatavar} = helpers.to_map(type(${resdatavar}_result) == 'table' and ${resdatavar}_result.data_get and ${resdatavar}_result:data_get() or ${resdatavar}_result)
    assert.is_not_nil(${resdatavar})
`)
  if (hasEntIdU) {
    Content(`    assert.are.equal(${resdatavar}["id"], ${datavar}_up["id"])
`)
  }

  if (step.s) {
    for (const spec of step.s) {
      if ('TextFieldMark' === spec.apply && null != step.i.textfield) {
        Content(`    assert.are.equal(${resdatavar}[${markdefvar}_name], ${markdefvar}_value)
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

  Content(`    -- LOAD
`)
  if (!hasEntVar) {
    Content(`    local ${entvar} = client:${entity.Name}(nil)
`)
  }
  if (!hasSrcData && (hasEntId || flowLoadReadsRecord(entity, step))) {
    Content(`    local ${srcdatavar}_raw = vs.items(helpers.to_map(
      vs.getpath(setup.data, "existing.${entity.name}")))
    local ${srcdatavar} = nil
    if #${srcdatavar}_raw > 0 then
      ${srcdatavar} = helpers.to_map(${srcdatavar}_raw[1][2])
    end
`)
  }
  if (hasEntId) {
    Content(`    local ${matchvar} = {
      id = ${srcdatavar}["id"],
    }
${loadMatch(entity, step, matchvar, srcdatavar)}${liveFill(entity, step, matchvar)}    local ${datavar}_loaded, err = ${entvar}:load(${matchvar}, nil)
    assert.is_nil(err)
    local ${datavar}_load_result = helpers.to_map(type(${datavar}_loaded) == 'table' and ${datavar}_loaded.data_get and ${datavar}_loaded:data_get() or ${datavar}_loaded)
    assert.is_not_nil(${datavar}_load_result)
    assert.are.equal(${datavar}_load_result["id"], ${srcdatavar}["id"])
`)
  }
  else {
    Content(`    local ${matchvar} = {}
${loadMatch(entity, step, matchvar, srcdatavar)}${liveFill(entity, step, matchvar)}    local ${datavar}_loaded, err = ${entvar}:load(${matchvar}, nil)
    assert.is_nil(err)
    assert.is_not_nil(${datavar}_loaded)
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

  Content(`    -- REMOVE
`)
  if (needsEnt) {
    Content(`    local ${entvar} = client:${entity.Name}(nil)
`)
  }
  // Always match the prior-created entity by id to avoid mock-order flakes.
  Content(`    local ${matchvar} = {
      id = ${srcdatavar}["id"],
    }
${parentMatch(step, matchvar)}    local _, err = ${entvar}:remove(${matchvar}, nil)
    assert.is_nil(err)
`)
}



// A child's route names its parents, and an entity no earlier step has
// filled knows none of them, so the call itself gives each parent id. A live
// ENTID may key a parent by its field name, the fixture by its own name.
// A live step sends each example its route requires and the step leaves unbound.
function liveFill(entity: any, step: any, matchvar: string): string {
  const fills = liveStepExamples(entity, step)
  return 0 === fills.length ? '' : `    if setup.live then
${fills.map(([k, ex]) => `      ${matchvar}[${JSON.stringify(k)}] = ${formatLuaValue(ex)}\n`).join('')}    end
`
}


function parentMatch(step: any, matchvar: string): string {
  return Object.entries(step.m || {})
    .filter(([k]: any) => k !== 'id' && !k.endsWith('$'))
    .map(([key, val]: any) => `    ${matchvar}["${key}"] = setup.idmap["${key}"] or setup.idmap["${val}"]
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
    return parentMatch(step, matchvar) + (0 === own.length ? '' : `    if not setup.live then
${own.map((arg) => `      do
        local own = ${srcdatavar}["${arg.field}"]
        if type(own) == "string" or type(own) == "number" or type(own) == "boolean" then
          ${matchvar}["${arg.name}"] = own
        end
      end
`).join('')}    end
`)
  }
  return route.args.map((arg) => {
    const bound = arg.idmap.map((key) => `setup.idmap["${key}"]`).join(' or ')
    return null == arg.field ? `    ${matchvar}["${arg.name}"] = ${bound}
` : `    do
      local own = ${srcdatavar}["${arg.field}"]
      if type(own) == "string" or type(own) == "number" or type(own) == "boolean" then
        ${matchvar}["${arg.name}"] = own
      else
        ${matchvar}["${arg.name}"] = ${bound}
      end
    end
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
function failHookClass(entity: ModelEntity): string {
  return `
local BaseFeature = require("feature.base_feature")

local FailHook = {}
FailHook.__index = FailHook
setmetatable(FailHook, { __index = BaseFeature })

function FailHook.new()
  local self = setmetatable(BaseFeature.new(), FailHook)
  self.name = "failhook"
  self.unexpected = 0
  return self
end

function FailHook:init(_ctx, _options) end
function FailHook:PreSpec(_ctx) error("${entity.name} hook failed") end
function FailHook:PreUnexpected(_ctx) self.unexpected = self.unexpected + 1 end

local function errtext(err)
  if type(err) == "table" then
    return tostring(err.msg or err.message or "")
  end
  return tostring(err)
end
`
}


// A failed operation raises from a stream as it fails the operation: a
// transport failure, and a hook that rejects the call. A raising hook fires
// PreUnexpected, and under throw false the call returns no error. The
// caller's ctrl stays its own.
function failureTests(entity: ModelEntity): string {
  const Entity = entity.Name
  return `
  it("should report a failed stream", function()
    local offline = { net = { offline = true } }
    local ok, err = pcall(function()
      for _ in sdk.test(offline, nil):${Entity}(nil):stream("list", nil, nil) do end
    end)
    assert.is_false(ok)
    assert.truthy(string.find(errtext(err), "offline", 1, true))

    for _ in sdk.test(offline, nil):${Entity}(nil):stream("list", nil, { ctrl = { throw = false } }) do end

    local config = require("config_shared")()
    if type(config.feature) == "table" and config.feature.rbac ~= nil then
      local denied = sdk.test(nil, { feature = { rbac = { active = true, deny = true } } })
      local dok, derr = pcall(function()
        for _ in denied:${Entity}(nil):stream("list", nil, nil) do end
      end)
      assert.is_false(dok)
      assert.are.equal("rbac_denied", type(derr) == "table" and derr.code or nil)
    end
  end)

  it("should leave the caller's ctrl", function()
    local explain = {}
    local ctrl = { explain = explain }
    for _ in sdk.test(nil, nil):${Entity}(nil):stream("list", nil, { ctrl = ctrl }) do end
    assert.is_nil(ctrl.stream)
    assert.are.equal(explain, ctrl.explain)
    assert.is_not_nil(next(explain))
  end)

  it("should fire PreUnexpected", function()
    local hook = FailHook.new()
    local client = sdk.new({ feature = { test = { active = true } }, extend = { hook } })

    local out, err = client:${Entity}(nil):list(nil, nil)
    assert.is_nil(out)
    assert.truthy(string.find(errtext(err), "hook failed", 1, true))
    assert.is_true(hook.unexpected > 0)

    local fired = hook.unexpected
    out, err = client:${Entity}(nil):list(nil, { throw = false })
    assert.is_nil(err)
    assert.is_true(hook.unexpected > fired)
  end)
`
}


// An invalid request fails with validate's own error, before it is sent.
function validateTest(entity: ModelEntity): string {
  const bad = invalidRequest(entity)
  if (null == bad) {
    return ''
  }
  const args = Object.entries(bad.args)
    .map(([k, v]) => '[' + JSON.stringify(k) + '] = ' + formatLuaValue(v)).join(', ')
  return `
  it("should refuse an invalid request", function()
    local config = require("config_shared")()
    if type(config.feature) ~= "table" or config.feature.validate == nil then
      pending("feature not present in this SDK: validate")
      return
    end
    local client = sdk.test(nil, { feature = { validate = { active = true } } })
    local _, err = client:${entity.Name}(nil):${bad.op}({ ${args} }, nil)
    assert.are.equal("validate_failed", type(err) == "table" and err.code or nil)
  end)
`
}


export {
  TestEntity
}
