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
  entityDataIdField, envName, envToken,
  serverVarEnv,
  serverVariables,
  invalidRequest,
  liveFlowNeeds, liveStrict, liveStrictNote,
  liveRouteExamples, liveStepExamples, flowLoadRoute, flowLoadReadsRecord,
  liveGetOnly, liveExcludedLines, liveExcludedSummary, LIVE_GETONLY_ENV,
  liveEntity,
} from '@voxgig/sdkgen'

import { formatRubyValue } from './utility_rb'


// The live prologue of a flow built from offline fixtures: blocked without
// the ids it binds, and a create-less load reading the first listed record.
function liveFlowGate(entity: any, needs: any, entidEnv: string): string {
  let out = ''
  if (0 < needs.keys.length) {
    out += `    if setup[:live]
      [${needs.keys.map((k: string) => JSON.stringify(k)).join(', ')}].each do |_live_key|
        if setup[:synthetic_only] || setup[:idmap][_live_key].nil?
          Runner.live_miss(LIVE_STRICT, "Live entity test blocked: needs #{_live_key} via ${entidEnv}")
        end
      end
    end
`
  }
  if (null != needs.blocked) {
    out += `    if setup[:live]
      Runner.live_miss(LIVE_STRICT, "Live entity test blocked: " + ${JSON.stringify(needs.blocked)})
    end
`
  }
  out += '    client = setup[:client]\n'
  if (null != needs.discover) {
    const match = Object.entries(needs.discover)
      .map(([k, v]: any) => `${JSON.stringify(k)} => setup[:idmap][${JSON.stringify(v)}]`)
      .concat(liveRouteExamples(entity, 'list', Object.keys(needs.discover))
        .map(([k, ex]) => `${JSON.stringify(k)} => ${formatRubyValue(ex)}`)).join(', ')
    out += `    if setup[:live]
      Runner.live_existing(setup, LIVE_STRICT, ${JSON.stringify(entity.name)}) do
        client.${entity.Name}(nil).list({${match}}, nil)
      end
    end
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
    ? `\n    "${PROJUPPER}_APIKEY" => "",`
    : ''
  const apikeyLiveField = authActive
    ? `\n        "apikey" => env["${PROJUPPER}_APIKEY"],`
    : ''

  // A templated server URL (OpenAPI server variables) makes a LIVE client
  // impossible to construct without values: makeOptions raises rather than
  // request a URL with a literal `{account_id}` in it. So the live suite
  // takes them from the environment the same way it takes the apikey.
  const svars = serverVariables(model)
  const serverEnvEntry = svars
    .map((v: any) => `\n    "${serverVarEnv(PROJUPPER, v.name)}" => ${formatRubyValue(v.dflt)},`).join('')
  const serverLiveField = 0 === svars.length ? '' : `
        "server" => {${svars
      .map((v: any) => `
          "${v.name}" => env["${serverVarEnv(PROJUPPER, v.name)}"],`).join('')}
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

    Content(`# ${entity.Name} entity test

require "minitest/autorun"
require "json"
require_relative "../${model.const.Name}_sdk"
require_relative "runner"

class ${entity.Name}EntityTest < Minitest::Test
${liveStrictNote(strict, '#', '  ')}
  LIVE_STRICT = ${strict}

  def test_create_instance
    testsdk = ${model.const.Name}SDK.test(nil, nil)
    ent = testsdk.${entity.Name}(nil)
    assert !ent.nil?
  end
${hasList ? `
  def test_list_entities
    seed = {
      "entity" => {
        "${entity.name}" => {
          "l1" => { "id" => "l1" },
          "l2" => { "id" => "l2" },
        },
      },
    }
    items = ${model.const.Name}SDK.test(seed, nil).${entity.Name}(nil).list(nil, nil)
    # list resolves to one entity per record; data_get reads the record.
    assert_equal 2, items.length
    items.each do |item|
      assert item.respond_to?(:data_get)
      assert item.data_get.is_a?(Hash)
    end
  end

  # Feature #4: the entity stream(action, ...) method runs the op pipeline and
  # returns an Enumerator over result items. With the streaming feature active
  # it yields the feature's incremental output; otherwise it falls back to the
  # materialised list so stream always yields.
  def test_stream
    seed = {
      "entity" => {
        "${entity.name}" => {
          "s1" => { "id" => "s1" },
          "s2" => { "id" => "s2" },
          "s3" => { "id" => "s3" },
        },
      },
    }

    # Fallback: streaming inactive -> yields the materialised list items.
    base = ${model.const.Name}SDK.test(seed, nil)
    seen = base.${entity.Name}(nil).stream("list", nil, nil).to_a
    assert_equal 3, seen.length

    # Inbound: streaming active -> yields each item from the feature.
    cfg = ${model.const.Name}Config.shared_config
    if cfg["feature"].is_a?(Hash) && cfg["feature"].key?("streaming")
      sdk = ${model.const.Name}SDK.test(seed, { "feature" => { "streaming" => { "active" => true } } })
      got = []
      sdk.${entity.Name}(nil).stream("list", nil, nil).each do |item|
        if item.is_a?(Array)
          got.concat(item)
        else
          got << item
        end
      end
      assert_equal 3, got.length
    end
  end
${failureTests(model, entity)}${validateListTest(model, entity)}` : ''}${validateTest(model, entity)}
  def test_basic_flow
    setup = ${entity.name}_basic_setup(nil)
    # Per-op sdk-test-control.json skip.
    _live = setup[:live] || false
    [${(Array.from(new Set((allSteps as any[]).map((s: any) => s.o).filter(Boolean)))).map(o => `"${o}"`).join(', ')}].each do |_op|
      _should_skip, _reason = Runner.is_control_skipped("entityOp", "${entity.name}." + _op, _live ? "live" : "unit")
      if _should_skip
        skip(_reason || "skipped via sdk-test-control.json")
        return
      end
    end
`)

    const flowBody = (flow: any) => {
      const steps = flowSteps(flow) as any[]
      Content(liveFlowGate(entity, liveFlowNeeds(entity, flow), entidEnv) + '\n')

      // Check if the flow has a create step
      const flowHasCreate = steps.some((s: any) => s.o === 'create')
      if (!flowHasCreate) {
        Content(`    # Bootstrap entity data from existing test data.
    ${entity.name}_ref01_data_raw = Vs.items(Helpers.to_map(
      Vs.getpath(setup[:data], "existing.${entity.name}")))
    ${entity.name}_ref01_data = nil
    if ${entity.name}_ref01_data_raw.length > 0
      ${entity.name}_ref01_data = Helpers.to_map(${entity.name}_ref01_data_raw[0][1])
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
    }

    const getOnly = liveGetOnly(entity, basicflow)
    if (null != getOnly) {
      Content(`    if setup[:live] && ENV[${formatRubyValue(LIVE_GETONLY_ENV)}] == "TRUE"
${liveExcludedLines(getOnly).map((line) => '      puts ' + formatRubyValue(line) + '\n').join('')}`)
      if (0 === flowSteps(getOnly.flow).length) {
        Content(`      skip(${formatRubyValue(liveExcludedSummary(getOnly))})
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

    Content(`${strict ? '' : `  rescue Minitest::Skip
    raise
  rescue StandardError, Minitest::Assertion => e
    Runner.live_observe(e, setup, LIVE_STRICT)
`}  end
end

`)

    // Generate setup function
    Content(`def ${entity.name}_basic_setup(extra)
  Runner.load_env_local

  entity_data_file = File.join(__dir__, "..", "..", ".sdk", "test", "entity", "${entity.name}", "${entity.Name}TestData.json")
  entity_data_source = File.read(entity_data_file, encoding: "UTF-8")
  entity_data = JSON.parse(entity_data_source)

  options = {}
  options["entity"] = entity_data["existing"]

  client = ${model.const.Name}SDK.test(options, extra)

`)

    // Generate idmap via Vs.transform
    Content(`  # Generate idmap via transform.
  idmap = Vs.transform(
    [${idnamesStr}],
    {
      "\`$PACK\`" => ["", {
        "\`$KEY\`" => "\`$COPY\`",
        "\`$VAL\`" => ["\`$FORMAT\`", "upper", "\`$COPY\`"],
      }],
    }
  )

`)

    Content(`  # Whether *_ENTID supplied the idmap, read before env_override consumes
  # it: without it, the ids a live flow binds are the fixture's synthetic ones.
  entid_env_raw = ENV["${PROJUPPER}_TEST_${envToken(entity.name)}_ENTID"]
  idmap_overridden = !entid_env_raw.nil? && entid_env_raw.strip.start_with?("{")

  env = Runner.env_override({
    "${PROJUPPER}_TEST_${envToken(entity.name)}_ENTID" => idmap,
    "${PROJUPPER}_TEST_LIVE" => "FALSE",
    "${PROJUPPER}_TEST_EXPLAIN" => "FALSE",${apikeyEnvEntry}${serverEnvEntry}
  })

  idmap_resolved = Helpers.to_map(
    env["${PROJUPPER}_TEST_${envToken(entity.name)}_ENTID"])
  if idmap_resolved.nil?
    idmap_resolved = Helpers.to_map(idmap)
  end
`)

    // Add aliases
    for (const [key, val] of aliases) {
      Content(`  if idmap_resolved["${key}"].nil?
    idmap_resolved["${key}"] = idmap_resolved["${val}"]
  end
`)
    }

    Content(`
  if env["${PROJUPPER}_TEST_LIVE"] == "TRUE"
    merged_opts = Vs.merge([
      # FIRST, so the generated fields below win: sdk-test-control.json's
      # test.client.options adds to the live client, it does not redirect it.
      Runner.live_client_options,
      {${apikeyLiveField}${serverLiveField}
      },
      extra || {},
    ])
    client = ${model.const.Name}SDK.new(Helpers.to_map(merged_opts))
  end

  live = env["${PROJUPPER}_TEST_LIVE"] == "TRUE"
  {
    client: client,
    data: entity_data,
    idmap: idmap_resolved,
    env: env,
    explain: env["${PROJUPPER}_TEST_EXPLAIN"] == "TRUE",
    live: live,
    synthetic_only: live && !idmap_overridden,
    now: (Time.now.to_f * 1000).to_i,
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

  Content(`    # CREATE
`)
  if (needsEnt) {
    Content(`    ${entvar} = client.${entity.Name}(nil)
`)
  }

  if (hasDatvar) {
    Content(`    ${datavar} = Helpers.to_map(Vs.getprop(
      Vs.getpath(setup[:data], "new.${entity.name}"), "${ref}"))
`)
  } else {
    Content(`    ${datavar} = Helpers.to_map(Vs.getprop(
      Vs.getpath(setup[:data], "new.${entity.name}"), "${ref}"))
`)
  }

  const matchEntries = getMatchEntries(step)
  for (const [key, val] of matchEntries) {
    Content(`    ${datavar}["${key}"] = setup[:idmap]["${val}"]
`)
  }

  Content(`
    ${datavar}_result = ${entvar}.create(${datavar}, nil)
    ${datavar} = Helpers.to_map(${datavar}_result.respond_to?(:data_get) ? ${datavar}_result.data_get : ${datavar}_result)
    assert !${datavar}.nil?
`)
  if (null != ctx.entity.id) {
    Content(`    assert !${datavar}["id"].nil?
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

  Content(`    # LIST
`)
  if (needsEnt) {
    Content(`    ${entvar} = client.${entity.Name}(nil)
`)
  }

  const matchEntries = getMatchEntries(step)
  if (matchEntries.length === 0) {
    Content(`    ${matchvar} = {}
`)
  } else {
    Content(`    ${matchvar} = {
`)
    for (const [key, val] of matchEntries) {
      Content(`      "${key}" => setup[:idmap]["${val}"],
`)
    }
    Content(`    }
`)
  }
  Content(liveFill(entity, step, matchvar))

  Content(`
    ${listvar}_result = ${entvar}.list(${matchvar}, nil)
    assert ${listvar}_result.is_a?(Array)
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
    found_item = Vs.select(
      Runner.entity_list_to_data(${listvar}_result),
      { "id" => ${refDataVar}["id"] })
    assert !Vs.isempty(found_item)
`)
      } else if ('ItemNotExists' === validator.apply && hasRefData && hasDataId) {
        const refDataVar = validRef + '_data'
        Content(`
    not_found_item = Vs.select(
      Runner.entity_list_to_data(${listvar}_result),
      { "id" => ${refDataVar}["id"] })
    assert Vs.isempty(not_found_item)
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

  Content(`    # UPDATE
`)
  if (needsEnt) {
    Content(`    ${entvar} = client.${entity.Name}(nil)
`)
  }
  Content(`    ${datavar}_up = {
`)
  if (hasEntIdU) {
    Content(`      "id" => ${srcdatavar}["id"],
`)
  }

  if (step.d) {
    const dataEntries = Object.entries(step.d).filter(([k]: any) => k !== 'id' && !k.endsWith('$'))
    for (const [key] of dataEntries) {
      Content(`      "${key}" => setup[:idmap]["${key}"],
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
    ${markdefvar}_name = "${fieldname}"
    ${markdefvar}_value = "${fieldvalue}_#{setup[:now]}"
    ${datavar}_up[${markdefvar}_name] = ${markdefvar}_value
`)
      }
    }
  }

  Content(`
    ${resdatavar}_result = ${entvar}.update(${datavar}_up, nil)
    ${resdatavar} = Helpers.to_map(${resdatavar}_result.respond_to?(:data_get) ? ${resdatavar}_result.data_get : ${resdatavar}_result)
    assert !${resdatavar}.nil?
`)
  if (hasEntIdU) {
    Content(`    assert_equal ${resdatavar}["id"], ${datavar}_up["id"]
`)
  }

  if (step.s) {
    for (const spec of step.s) {
      if ('TextFieldMark' === spec.apply && null != step.i.textfield) {
        Content(`    assert_equal ${resdatavar}[${markdefvar}_name], ${markdefvar}_value
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

  Content(`    # LOAD
`)
  if (!hasEntVar) {
    Content(`    ${entvar} = client.${entity.Name}(nil)
`)
  }
  if (!hasSrcData && (hasEntId || flowLoadReadsRecord(entity, step))) {
    Content(`    ${srcdatavar}_raw = Vs.items(Helpers.to_map(
      Vs.getpath(setup[:data], "existing.${entity.name}")))
    ${srcdatavar} = nil
    if ${srcdatavar}_raw.length > 0
      ${srcdatavar} = Helpers.to_map(${srcdatavar}_raw[0][1])
    end
`)
  }
  if (hasEntId) {
    Content(`    ${matchvar} = {
      "id" => ${srcdatavar}["id"],
    }
${loadMatch(entity, step, matchvar, srcdatavar)}${liveFill(entity, step, matchvar)}    ${datavar}_loaded = ${entvar}.load(${matchvar}, nil)
    ${datavar}_load_result = Helpers.to_map(${datavar}_loaded.respond_to?(:data_get) ? ${datavar}_loaded.data_get : ${datavar}_loaded)
    assert !${datavar}_load_result.nil?
    assert_equal ${datavar}_load_result["id"], ${srcdatavar}["id"]
`)
  }
  else {
    Content(`    ${matchvar} = {}
${loadMatch(entity, step, matchvar, srcdatavar)}${liveFill(entity, step, matchvar)}    ${datavar}_loaded = ${entvar}.load(${matchvar}, nil)
    assert !${datavar}_loaded.nil?
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

  Content(`    # REMOVE
`)
  if (needsEnt) {
    Content(`    ${entvar} = client.${entity.Name}(nil)
`)
  }
  // Always match the prior-created entity by id to avoid mock-order flakes.
  Content(`    ${matchvar} = {
      "id" => ${srcdatavar}["id"],
    }
${parentMatch(step, matchvar)}    ${entvar}.remove(${matchvar}, nil)
`)
}



// A child's route names its parents, and an entity no earlier step has
// filled knows none of them, so the call itself gives each parent id. A live
// ENTID may key a parent by its field name, the fixture by its own name.
// A live step sends each example its route requires and the step leaves unbound.
function liveFill(entity: any, step: any, matchvar: string): string {
  const fills = liveStepExamples(entity, step)
  return 0 === fills.length ? '' : `    if setup[:live]
${fills.map(([k, ex]) => `      ${matchvar}[${JSON.stringify(k)}] = ${formatRubyValue(ex)}\n`).join('')}    end
`
}


function parentMatch(step: any, matchvar: string): string {
  return Object.entries(step.m || {})
    .filter(([k]: any) => k !== 'id' && !k.endsWith('$'))
    .map(([key, val]: any) => `    ${matchvar}["${key}"] = setup[:idmap]["${key}"] || setup[:idmap]["${val}"]
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
    return parentMatch(step, matchvar) + (0 === own.length ? '' : `    unless setup[:live]
${own.map((arg) => `      own = ${srcdatavar}["${arg.field}"]
      ${matchvar}["${arg.name}"] = own if [String, Numeric, TrueClass, FalseClass].any? { |c| own.is_a?(c) }
`).join('')}    end
`)
  }
  return route.args.map((arg) => {
    const bound = arg.idmap.map((key) => `setup[:idmap]["${key}"]`).join(' || ')
    const own = `${srcdatavar}["${arg.field}"]`
    return `    ${matchvar}["${arg.name}"] = ${null == arg.field ? bound :
      `[String, Numeric, TrueClass, FalseClass].any? { |c| ${own}.is_a?(c) } ? ${own} : (${bound})`}
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


// A failed operation raises from a stream as it does from the operation: a
// transport failure, and a hook that rejects the call. A raising hook fires
// PreUnexpected, and under throw false the call returns nil. The caller's
// ctrl stays its own.
function failureTests(model: Model, entity: ModelEntity): string {
  const Name = model.const.Name
  const Entity = entity.Name
  return `
  class FailHook < ${Name}BaseFeature
    attr_reader :unexpected

    def initialize
      super()
      @name = "failhook"
      @unexpected = 0
    end

    def PreSpec(ctx)
      raise "${entity.name} hook failed"
    end

    def PreUnexpected(ctx)
      @unexpected += 1
    end
  end

  def test_stream_error
    offline = { "net" => { "offline" => true } }
    err = assert_raises(StandardError) do
      ${Name}SDK.test(offline, nil).${Entity}(nil).stream("list", nil, nil).to_a
    end
    assert_match(/offline/, err.message)

    ${Name}SDK.test(offline, nil).${Entity}(nil)
      .stream("list", nil, { "ctrl" => { "throw" => false } }).to_a

    cfg = ${Name}Config.shared_config
    if cfg["feature"].is_a?(Hash) && cfg["feature"].key?("rbac")
      denied = ${Name}SDK.test(nil, { "feature" => { "rbac" => { "active" => true, "deny" => true } } })
      err = assert_raises(StandardError) do
        denied.${Entity}(nil).stream("list", nil, nil).to_a
      end
      assert_equal "rbac_denied", err.code
    end
  end

  def test_stream_ctrl
    explain = {}
    ctrl = { "explain" => explain }
    ${Name}SDK.test(nil, nil).${Entity}(nil).stream("list", nil, { "ctrl" => ctrl }).to_a
    assert_equal ["explain"], ctrl.keys
    assert_same explain, ctrl["explain"]
    refute_empty explain
  end

  def test_unexpected
    hook = FailHook.new
    client = ${Name}SDK.new({ "feature" => { "test" => { "active" => true } }, "extend" => [hook] })

    err = assert_raises(StandardError) do
      client.${Entity}(nil).list(nil, nil)
    end
    assert_match(/hook failed/, err.message)
    assert_operator hook.unexpected, :>, 0

    fired = hook.unexpected
    assert_nil client.${Entity}(nil).list(nil, { "throw" => false })
    assert_operator hook.unexpected, :>, fired
  end
`
}


// An invalid request fails with validate's own error, before it is sent.
function validateTest(model: Model, entity: ModelEntity): string {
  const bad = invalidRequest(entity)
  if (null == bad) {
    return ''
  }
  const Name = model.const.Name
  const args = Object.entries(bad.args)
    .map(([k, v]) => JSON.stringify(k) + ' => ' + formatRubyValue(v)).join(', ')
  return `
  def test_validate
    cfg = ${Name}Config.shared_config
    unless cfg["feature"].is_a?(Hash) && cfg["feature"].key?("validate")
      skip("feature not present in this SDK: validate")
    end
    client = ${Name}SDK.test(nil, { "feature" => { "validate" => { "active" => true } } })
    err = assert_raises(StandardError) do
      client.${entity.Name}(nil).${bad.op}({ ${args} }, nil)
    end
    assert_equal "validate_failed", err.code
  end
`
}


// A list response is checked record by record, not entity by entity.
function validateListTest(model: Model, entity: ModelEntity): string {
  const seeds = validateSeeds(entity)
  if (null == seeds) {
    return ''
  }
  const Name = model.const.Name
  const seed = (rec: Record<string, any>) =>
    '{ "entity" => { ' + formatRubyValue(entity.name) + ' => { "v1" => { ' +
    Object.entries(rec).map(([k, v]) => formatRubyValue(k) + ' => ' + formatRubyValue(v)).join(', ') +
    ' } } } }'
  return `
  def test_validate_list_response
    cfg = ${Name}Config.shared_config
    unless cfg["feature"].is_a?(Hash) && cfg["feature"].key?("validate")
      skip("feature not present in this SDK: validate")
    end
    opts = { "feature" => { "validate" => { "active" => true, "request" => false, "response" => true } } }
    listed = ${Name}SDK.test(${seed(seeds.valid)}, opts).${entity.Name}(nil).list(nil, nil)
    assert_equal ["v1"], listed.map { |ent| ent.data_get["id"] }
${null == seeds.invalid ? '' : `    err = assert_raises(StandardError) do
      ${Name}SDK.test(${seed(seeds.invalid)}, opts).${entity.Name}(nil).list(nil, nil)
    end
    assert_equal "validate_failed", err.code
`}  end
`
}


export {
  TestEntity
}
