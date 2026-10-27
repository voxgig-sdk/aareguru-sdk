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
  phpEntityAccessor,
  invalidRequest,
  liveFlowNeeds, liveStrict, liveStrictNote,
  liveRouteExamples, liveStepExamples, flowLoadRoute, flowLoadReadsRecord,
  liveGetOnly, liveExcludedLines, liveExcludedSummary, LIVE_GETONLY_ENV,
  liveEntity,
} from '@voxgig/sdkgen'

import { formatPhpValue } from './utility_php'


// The live prologue of a flow built from offline fixtures: blocked without
// the ids it binds, a create-less load reading the first listed record, and
// a lenient run observing its checks rather than failing on them.
function liveFlowGate(entity: any, needs: any, entidEnv: string, accessor: string,
  strict: boolean): string {
  let out = ''
  if (0 < needs.keys.length) {
    out += `        if (!empty($setup["live"])) {
            foreach ([${needs.keys.map((k: string) => JSON.stringify(k)).join(', ')}] as $_liveKey) {
                if (!empty($setup["synthetic_only"]) || null === ($setup["idmap"][$_liveKey] ?? null)) {
                    Runner::live_miss(self::LIVE_STRICT, "Live entity test blocked: needs " . $_liveKey . " via ${entidEnv}");
                }
            }
        }
`
  }
  if (null != needs.blocked) {
    out += `        if (!empty($setup["live"])) {
            Runner::live_miss(self::LIVE_STRICT, "Live entity test blocked: " . ${JSON.stringify(needs.blocked)});
        }
`
  }
  out += '        $client = $setup["client"];\n'
  if (null != needs.discover) {
    const match = Object.entries(needs.discover)
      .map(([k, v]: any) => `${JSON.stringify(k)} => $setup["idmap"][${JSON.stringify(v)}] ?? null`)
      .concat(liveRouteExamples(entity, 'list', Object.keys(needs.discover))
        .map(([k, ex]) => `${JSON.stringify(k)} => ${formatPhpValue(ex)}`)).join(', ')
    out += `        if (!empty($setup["live"])) {
            Runner::live_existing($setup, self::LIVE_STRICT, ${JSON.stringify(entity.name)},
                fn() => $client->${accessor}(null)->list([${match}], null));
        }
`
  }
  if (!strict) {
    out += '        try {\n'
  }
  return out
}


type GenCtx = {
  model: Model
  entity: ModelEntity
  flow: ModelEntityFlow
  PROJUPPER: string
  accessor: string
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

  const entName = nom(entity, 'Name')
  const accessor = phpEntityAccessor(entName)

  const PROJUPPER = envName(model)

  const authActive = isAuthActive(model)
  const apikeyEnvEntry = authActive
    ? `\n        "${PROJUPPER}_APIKEY" => "",`
    : ''
  const apikeyLiveField = authActive
    ? `\n                "apikey" => $env["${PROJUPPER}_APIKEY"],`
    : ''

  // A templated server URL (OpenAPI server variables) makes a LIVE client
  // impossible to construct without values: makeOptions raises rather than
  // request a URL with a literal `{account_id}` in it. So the live suite
  // takes them from the environment the same way it takes the apikey.
  const svars = serverVariables(model)
  const serverEnvEntry = svars
    .map((v: any) => `\n        "${serverVarEnv(PROJUPPER, v.name)}" => ${formatPhpValue(v.dflt)},`).join('')
  const serverLiveField = 0 === svars.length ? '' : `
                "server" => [${svars
      .map((v: any) => `
                    "${v.name}" => $env["${serverVarEnv(PROJUPPER, v.name)}"],`).join('')}
                ],`

  const idnames = buildIdNames(entity, basicflow)
  const idnamesStr = idnames.map(n => `"${n}"`).join(', ')

  const allSteps = Object.values(flowSteps(basicflow)) as any[]
  const updateStep = allSteps.find((s: any) => s.o === 'update')
  const updateData = updateStep?.d
    ? Object.entries(updateStep.d).filter(([k]: any) => k !== 'id' && !k.endsWith('$'))
    : []
  const aliases = updateData.map(([k, v]: any) => [k, v])

  const genCtx: GenCtx = { model, entity, flow: basicflow, PROJUPPER, accessor }

  const strict = liveStrict(model, target.name)
  const entidEnv = PROJUPPER + '_TEST_' + envToken(entity.name) + '_ENTID'

  File({ name: entity.Name + 'EntityTest.' + target.ext }, () => {

    Content(`<?php
declare(strict_types=1);

// ${entity.Name} entity test

require_once __DIR__ . '/../${model.const.Name.toLowerCase()}_sdk.php';
require_once __DIR__ . '/Runner.php';

use PHPUnit\\Framework\\TestCase;
use Voxgig\\Struct\\Struct as Vs;
${hasList ? failHookClass(model, entity) : ''}
class ${entity.Name}EntityTest extends TestCase
{
${liveStrictNote(strict, '//', '    ')}
    private const LIVE_STRICT = ${strict};

    public function test_create_instance(): void
    {
        $testsdk = ${model.const.Name}SDK::test(null, null);
        $ent = $testsdk->${accessor}(null);
        $this->assertNotNull($ent);
    }
${hasList ? `
    // Feature #4: the entity stream(action, ...) method runs the op pipeline
    // and yields result items. With the streaming feature active it yields the
    // feature's incremental output; otherwise it falls back to the materialised
    // list so stream always yields.
    public function test_stream(): void
    {
        $seed = [
            "entity" => [
                "${entity.name}" => [
                    "s1" => ["id" => "s1"],
                    "s2" => ["id" => "s2"],
                    "s3" => ["id" => "s3"],
                ],
            ],
        ];

        // Fallback: streaming inactive -> yields the materialised list items.
        $base = ${model.const.Name}SDK::test($seed, null);
        $seen = iterator_to_array($base->${accessor}(null)->stream("list", null, null), false);
        $this->assertCount(3, $seen);

        // Inbound: streaming active -> yields each item from the feature.
        $cfg = ${model.const.Name}Config::shared_config();
        if (isset($cfg["feature"]) && is_array($cfg["feature"]) && isset($cfg["feature"]["streaming"])) {
            $sdk = ${model.const.Name}SDK::test($seed, ["feature" => ["streaming" => ["active" => true]]]);
            $got = [];
            foreach ($sdk->${accessor}(null)->stream("list", null, null) as $item) {
                if (is_array($item) && array_is_list($item)) {
                    foreach ($item as $sub) {
                        $got[] = $sub;
                    }
                } else {
                    $got[] = $item;
                }
            }
            $this->assertCount(3, $got);
        }
    }
${failureTests(model, entity, accessor)}${validateListTest(model, entity, accessor)}` : ''}${validateTest(model, entity, accessor)}
    public function test_basic_flow(): void
    {
        $setup = ${entity.name}_basic_setup(null);
        // Per-op sdk-test-control.json skip.
        $_live = !empty($setup["live"]);
        foreach ([${(Array.from(new Set((allSteps as any[]).map((s: any) => s.o).filter(Boolean)))).map(o => `"${o}"`).join(', ')}] as $_op) {
            [$_shouldSkip, $_reason] = Runner::is_control_skipped("entityOp", "${entity.name}." . $_op, $_live ? "live" : "unit");
            if ($_shouldSkip) {
                $this->markTestSkipped($_reason ?? "skipped via sdk-test-control.json");
                return;
            }
        }
`)

    const flowBody = (flow: any) => {
      const steps = flowSteps(flow) as any[]
      Content(liveFlowGate(entity, liveFlowNeeds(entity, flow), entidEnv, accessor, strict) + '\n')

      // Check if the flow has a create step
      const flowHasCreate = steps.some((s: any) => s.o === 'create')
      if (!flowHasCreate) {
        Content(`        // Bootstrap entity data from existing test data.
        $${entity.name}_ref01_data_raw = Vs::items(Helpers::to_map(
            Vs::getpath($setup["data"], "existing.${entity.name}")));
        $${entity.name}_ref01_data = null;
        if (count($${entity.name}_ref01_data_raw) > 0) {
            $${entity.name}_ref01_data = Helpers::to_map($${entity.name}_ref01_data_raw[0][1]);
        }

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

      Content(strict ? '' : `        } catch (\\Throwable $e) {
            Runner::live_observe($e, $setup, self::LIVE_STRICT);
        }
`)
    }

    const getOnly = liveGetOnly(entity, basicflow)
    if (null != getOnly) {
      Content(`        if (!empty($setup["live"]) && getenv(${formatPhpValue(LIVE_GETONLY_ENV)}) === "TRUE") {
${liveExcludedLines(getOnly).map((line) =>
  '            fwrite(STDOUT, ' + formatPhpValue(line) + ' . "\\n");\n').join('')}`)
      if (0 === flowSteps(getOnly.flow).length) {
        Content(`            $this->markTestSkipped(${formatPhpValue(liveExcludedSummary(getOnly))});
        }

`)
      }
      else {
        flowBody(getOnly.flow)
        Content(`            return;
        }

`)
      }
    }

    flowBody(basicflow)

    Content(`    }
}

`)

    // Generate setup function
    Content(`function ${entity.name}_basic_setup($extra)
{
    Runner::load_env_local();

    $entity_data_file = __DIR__ . '/../../.sdk/test/entity/${entity.name}/${entity.Name}TestData.json';
    $entity_data_source = file_get_contents($entity_data_file);
    $entity_data = json_decode($entity_data_source, true);

    $options = [];
    $options["entity"] = $entity_data["existing"];

    $client = ${model.const.Name}SDK::test($options, $extra);

`)

    // Generate idmap: key => UPPER(key)
    Content(`    // Generate idmap.
    $idmap = [];
    foreach ([${idnamesStr}] as $k) {
        $idmap[$k] = strtoupper($k);
    }

`)

    Content(`    // Whether *_ENTID supplied the idmap, read before env_override consumes
    // it: without it, the ids a live flow binds are the fixture's synthetic ones.
    $entid_env_raw = getenv("${PROJUPPER}_TEST_${envToken(entity.name)}_ENTID");
    $idmap_overridden = $entid_env_raw !== false && str_starts_with(trim($entid_env_raw), "{");

    $env = Runner::env_override([
        "${PROJUPPER}_TEST_${envToken(entity.name)}_ENTID" => $idmap,
        "${PROJUPPER}_TEST_LIVE" => "FALSE",
        "${PROJUPPER}_TEST_EXPLAIN" => "FALSE",${apikeyEnvEntry}${serverEnvEntry}
    ]);

    $idmap_resolved = Helpers::to_map(
        $env["${PROJUPPER}_TEST_${envToken(entity.name)}_ENTID"]);
    if ($idmap_resolved === null) {
        $idmap_resolved = Helpers::to_map($idmap);
    }
`)

    // Add aliases
    for (const [key, val] of aliases) {
      Content(`    if (!isset($idmap_resolved["${key}"])) {
        $idmap_resolved["${key}"] = $idmap_resolved["${val}"];
    }
`)
    }

    Content(`
    if ($env["${PROJUPPER}_TEST_LIVE"] === "TRUE") {
        $merged_opts = Vs::merge([
            // FIRST, so the generated fields below win: sdk-test-control.json's
            // test.client.options adds to the live client, it does not redirect it.
            Runner::live_client_options(),
            [${apikeyLiveField}${serverLiveField}
            ],
            // ismap, not a plain "?? []" default: an empty PHP array is a
            // LIST, and a non-map later entry REPLACES the accumulated map in
            // merge - so the no-extras call discarded live_client_options()
            // and the apikey/server map above it.
            Vs::ismap($extra) ? $extra : new \\stdClass(),
        ]);
        // "?? []" because merge legitimately answers with a stdClass when every
        // contributing entry is an EMPTY map - an SDK with no apikey and no
        // server variables generates an empty middle entry, so that is the
        // common case, not the edge one. to_map returns null for a non-array by
        // design, and the constructor takes a non-nullable array, so without the
        // fallback every such SDK died on "must be of type array, null given"
        // the moment live mode was switched on. Offline mode never reaches this
        // branch, which is why the offline suite stayed green.
        $client = new ${model.const.Name}SDK(Helpers::to_map($merged_opts) ?? []);
    }

    $live = $env["${PROJUPPER}_TEST_LIVE"] === "TRUE";
    return [
        "client" => $client,
        "data" => $entity_data,
        "idmap" => $idmap_resolved,
        "env" => $env,
        "explain" => $env["${PROJUPPER}_TEST_EXPLAIN"] === "TRUE",
        "live" => $live,
        "synthetic_only" => $live && !$idmap_overridden,
        "now" => (int)(microtime(true) * 1000),
    ];
}
`)
  })
})


const generateCreate: OpGen = (ctx, step, index) => {
  const { entity, flow, accessor } = ctx
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

  Content(`        // CREATE
`)
  if (needsEnt) {
    Content(`        $${entvar} = $client->${accessor}(null);
`)
  }

  if (hasDatvar) {
    Content(`        $${datavar} = Helpers::to_map(Vs::getprop(
            Vs::getpath($setup["data"], "new.${entity.name}"), "${ref}"));
`)
  } else {
    Content(`        $${datavar} = Helpers::to_map(Vs::getprop(
            Vs::getpath($setup["data"], "new.${entity.name}"), "${ref}"));
`)
  }

  const matchEntries = getMatchEntries(step)
  for (const [key, val] of matchEntries) {
    Content(`        $${datavar}["${key}"] = $setup["idmap"]["${val}"];
`)
  }

  Content(`
        $${datavar}_result = $${entvar}->create($${datavar}, null);
        $${datavar} = Helpers::to_map(is_object($${datavar}_result) && method_exists($${datavar}_result, 'data_get') ? $${datavar}_result->data_get() : $${datavar}_result);
        $this->assertNotNull($${datavar});
`)
  if (null != ctx.entity.id) {
    Content(`        $this->assertNotNull($${datavar}["id"]);
`)
  }
}


const generateList: OpGen = (ctx, step, index) => {
  const { entity, flow, accessor } = ctx
  const hasDataId = null != entityDataIdField(entity)
  const ref = step.i.ref ?? entity.name + '_ref01'
  const entvar = step.i.entvar ?? ref + '_ent'
  const matchvar = step.i.matchvar ?? (ref + '_match' + (step.i.suffix ?? ''))
  const listvar = step.i.listvar ?? (ref + '_list' + (step.i.suffix ?? ''))

  const priorSteps = Object.values(flowSteps(flow)).slice(0, Number(index)) as any[]
  const needsEnt = !priorSteps.some((s: any) =>
    ['create', 'list', 'load', 'update', 'remove'].includes(s.o))

  Content(`        // LIST
`)
  if (needsEnt) {
    Content(`        $${entvar} = $client->${accessor}(null);
`)
  }

  const matchEntries = getMatchEntries(step)
  if (matchEntries.length === 0) {
    Content(`        $${matchvar} = [];
`)
  } else {
    Content(`        $${matchvar} = [
`)
    for (const [key, val] of matchEntries) {
      Content(`            "${key}" => $setup["idmap"]["${val}"],
`)
    }
    Content(`        ];
`)
  }
  Content(liveFill(entity, step, matchvar))

  Content(`
        $${listvar}_result = $${entvar}->list($${matchvar}, null);
        $this->assertIsArray($${listvar}_result);
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
        $found_item = sdk_select(
            Runner::entity_list_to_data($${listvar}_result),
            ["id" => $${refDataVar}["id"]]);
        $this->assertNotEmpty($found_item);
`)
      } else if ('ItemNotExists' === validator.apply && hasRefData && hasDataId) {
        const refDataVar = validRef + '_data'
        Content(`
        $not_found_item = sdk_select(
            Runner::entity_list_to_data($${listvar}_result),
            ["id" => $${refDataVar}["id"]]);
        $this->assertEmpty($not_found_item);
`)
      }
    }
  }
}


const generateUpdate: OpGen = (ctx, step, index) => {
  const { entity, flow, accessor } = ctx
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

  Content(`        // UPDATE
`)
  if (needsEnt) {
    Content(`        $${entvar} = $client->${accessor}(null);
`)
  }
  Content(`        $${datavar}_up = [
`)
  if (hasEntIdU) {
    Content(`            "id" => $${srcdatavar}["id"],
`)
  }

  if (step.d) {
    const dataEntries = Object.entries(step.d).filter(([k]: any) => k !== 'id' && !k.endsWith('$'))
    for (const [key] of dataEntries) {
      Content(`            "${key}" => $setup["idmap"]["${key}"],
`)
    }
  }

  Content(`        ];
`)

  if (step.s) {
    for (const spec of step.s) {
      if ('TextFieldMark' === spec.apply && null != step.i.textfield) {
        const fieldname = step.i.textfield
        const fieldvalue = spec.def?.mark ?? `Mark01-${ref}`
        Content(`
        $${markdefvar}_name = "${fieldname}";
        $${markdefvar}_value = "${fieldvalue}_" . $setup["now"];
        $${datavar}_up[$${markdefvar}_name] = $${markdefvar}_value;
`)
      }
    }
  }

  Content(`
        $${resdatavar}_result = $${entvar}->update($${datavar}_up, null);
        $${resdatavar} = Helpers::to_map(is_object($${resdatavar}_result) && method_exists($${resdatavar}_result, 'data_get') ? $${resdatavar}_result->data_get() : $${resdatavar}_result);
        $this->assertNotNull($${resdatavar});
`)
  if (hasEntIdU) {
    Content(`        $this->assertEquals($${resdatavar}["id"], $${datavar}_up["id"]);
`)
  }

  if (step.s) {
    for (const spec of step.s) {
      if ('TextFieldMark' === spec.apply && null != step.i.textfield) {
        Content(`        $this->assertEquals($${resdatavar}[$${markdefvar}_name], $${markdefvar}_value);
`)
      }
    }
  }
}


const generateLoad: OpGen = (ctx, step, index) => {
  const { entity, flow, accessor } = ctx
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

  Content(`        // LOAD
`)
  if (!hasEntVar) {
    Content(`        $${entvar} = $client->${accessor}(null);
`)
  }
  if (!hasSrcData && (hasEntId || flowLoadReadsRecord(entity, step))) {
    Content(`        $${srcdatavar}_raw = Vs::items(Helpers::to_map(
            Vs::getpath($setup["data"], "existing.${entity.name}")));
        $${srcdatavar} = null;
        if (count($${srcdatavar}_raw) > 0) {
            $${srcdatavar} = Helpers::to_map($${srcdatavar}_raw[0][1]);
        }
`)
  }
  if (hasEntId) {
    Content(`        $${matchvar} = [
            "id" => $${srcdatavar}["id"],
        ];
${loadMatch(entity, step, matchvar, srcdatavar)}${liveFill(entity, step, matchvar)}        $${datavar}_loaded = $${entvar}->load($${matchvar}, null);
        $${datavar}_load_result = Helpers::to_map(is_object($${datavar}_loaded) && method_exists($${datavar}_loaded, 'data_get') ? $${datavar}_loaded->data_get() : $${datavar}_loaded);
        $this->assertNotNull($${datavar}_load_result);
        $this->assertEquals($${datavar}_load_result["id"], $${srcdatavar}["id"]);
`)
  }
  else {
    Content(`        $${matchvar} = [];
${loadMatch(entity, step, matchvar, srcdatavar)}${liveFill(entity, step, matchvar)}        $${datavar}_loaded = $${entvar}->load($${matchvar}, null);
        $this->assertNotNull($${datavar}_loaded);
`)
  }
}


const generateRemove: OpGen = (ctx, step, index) => {
  const { entity, flow, accessor } = ctx
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

  Content(`        // REMOVE
`)
  if (needsEnt) {
    Content(`        $${entvar} = $client->${accessor}(null);
`)
  }
  // Always match the prior-created entity by id to avoid mock-order flakes.
  Content(`        $${matchvar} = [
            "id" => $${srcdatavar}["id"],
        ];
${parentMatch(step, matchvar)}        $${entvar}->remove($${matchvar}, null);
`)
}



// A child's route names its parents, and an entity no earlier step has
// filled knows none of them, so the call itself gives each parent id. A live
// ENTID may key a parent by its field name, the fixture by its own name.
// A live step sends each example its route requires and the step leaves unbound.
function liveFill(entity: any, step: any, matchvar: string): string {
  const fills = liveStepExamples(entity, step)
  return 0 === fills.length ? '' : `        if (!empty($setup["live"])) {
${fills.map(([k, ex]) => `            $${matchvar}[${JSON.stringify(k)}] = ${formatPhpValue(ex)};\n`).join('')}        }
`
}


function parentMatch(step: any, matchvar: string): string {
  return Object.entries(step.m || {})
    .filter(([k]: any) => k !== 'id' && !k.endsWith('$'))
    .map(([key, val]: any) => `        $${matchvar}["${key}"] = $setup["idmap"]["${key}"] ?? $setup["idmap"]["${val}"] ?? null;
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
    return parentMatch(step, matchvar) + (0 === own.length ? '' : `        if (empty($setup["live"])) {
${own.map((arg) => `            if (is_scalar($${srcdatavar}["${arg.field}"] ?? null)) {
                $${matchvar}["${arg.name}"] = $${srcdatavar}["${arg.field}"];
            }
`).join('')}        }
`)
  }
  return route.args.map((arg) => {
    const bound = arg.idmap.map((key) => `$setup["idmap"]["${key}"]`).join(' ?? ') + ' ?? null'
    const own = `$${srcdatavar}["${arg.field}"]`
    return `        $${matchvar}["${arg.name}"] = ${null == arg.field ? bound :
      `is_scalar(${own} ?? null) ? ${own} : (${bound})`};
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


// A feature whose PreSpec hook throws, counting the PreUnexpected calls it sees.
function failHookClass(model: Model, entity: ModelEntity): string {
  const Name = model.const.Name
  return `
class ${entity.Name}EntityTestFailHook extends ${Name}BaseFeature
{
    public int $unexpected = 0;

    public function __construct()
    {
        parent::__construct();
        $this->name = 'failhook';
    }

    public function init(${Name}Context $ctx, array $options): void
    {
    }

    public function PreSpec(${Name}Context $ctx): void
    {
        throw new \\RuntimeException('${entity.name} hook failed');
    }

    public function PreUnexpected(${Name}Context $ctx): void
    {
        $this->unexpected++;
    }
}
`
}


// A failed operation raises from a stream as it does from the operation: a
// transport failure, and a hook that rejects the call. A throwing hook fires
// PreUnexpected, and under throw false the call returns null. The caller's
// ctrl stays its own.
function failureTests(model: Model, entity: ModelEntity, accessor: string): string {
  const Name = model.const.Name
  return `
    public function test_stream_error(): void
    {
        $offline = ["net" => ["offline" => true]];
        $streamerr = null;
        try {
            iterator_to_array(${Name}SDK::test($offline, null)->${accessor}(null)
                ->stream("list", null, null), false);
        } catch (\\Throwable $e) {
            $streamerr = $e;
        }
        $this->assertNotNull($streamerr, 'the stream should raise the transport failure');
        $this->assertStringContainsString('offline', $streamerr->getMessage());

        iterator_to_array(${Name}SDK::test($offline, null)->${accessor}(null)
            ->stream("list", null, ["ctrl" => ["throw" => false]]), false);

        $cfg = ${Name}Config::shared_config();
        if (isset($cfg["feature"]["rbac"])) {
            $denied = ${Name}SDK::test(null, ["feature" => ["rbac" => ["active" => true, "deny" => true]]]);
            $denyerr = null;
            try {
                iterator_to_array($denied->${accessor}(null)->stream("list", null, null), false);
            } catch (\\Throwable $e) {
                $denyerr = $e;
            }
            $this->assertSame('rbac_denied', $denyerr->sdk_code ?? null);
        }
    }

    public function test_stream_ctrl(): void
    {
        $ctrl = ["explain" => []];
        iterator_to_array(${Name}SDK::test(null, null)->${accessor}(null)
            ->stream("list", null, ["ctrl" => $ctrl]), false);
        $this->assertSame(["explain"], array_keys($ctrl));
    }

    public function test_unexpected(): void
    {
        $hook = new ${entity.Name}EntityTestFailHook();
        $client = new ${Name}SDK(["feature" => ["test" => ["active" => true]], "extend" => [$hook]]);

        $err = null;
        try {
            $client->${accessor}(null)->list(null, null);
        } catch (\\Throwable $e) {
            $err = $e;
        }
        $this->assertNotNull($err, 'the throwing hook should fail the operation');
        $this->assertStringContainsString('hook failed', $err->getMessage());
        $this->assertGreaterThan(0, $hook->unexpected, 'PreUnexpected did not fire');

        $fired = $hook->unexpected;
        $this->assertNull($client->${accessor}(null)->list(null, ["throw" => false]));
        $this->assertGreaterThan($fired, $hook->unexpected, 'PreUnexpected did not fire');
    }

    public function test_cost_commits_a_throwing_transport(): void
    {
        $cfg = ${Name}Config::shared_config();
        if (!isset($cfg["feature"]["cost"])) {
            $this->markTestSkipped('feature not present in this SDK: cost');
        }
        $client = new ${Name}SDK([
            "test" => ["active" => true],
            "feature" => ["cost" => ["active" => true, "unit" => 1]],
            "utility" => ["fetcher" => function ($ctx, $url, $fetchdef) {
                throw new \\RuntimeException('${entity.name} transport failed');
            }],
        ]);

        $err = null;
        try {
            $client->${accessor}(null)->list(null, null);
        } catch (\\Throwable $e) {
            $err = $e;
        }
        $this->assertInstanceOf(${Name}Error::class, $err);
        $this->assertStringContainsString('transport failed', $err->getMessage());

        $client->${accessor}(null)->list(null, ["throw" => false]);
        $this->assertSame(2, $client->_cost["total"]["calls"]);
        $this->assertSame(2, $client->_cost["total"]["attempts"]);
    }
`
}


// An invalid request fails with validate's own error, before it is sent.
function validateTest(model: Model, entity: ModelEntity, accessor: string): string {
  const bad = invalidRequest(entity)
  if (null == bad) {
    return ''
  }
  const Name = model.const.Name
  const args = Object.entries(bad.args)
    .map(([k, v]) => JSON.stringify(k) + ' => ' + formatPhpValue(v)).join(', ')
  return `
    public function test_validate(): void
    {
        $cfg = ${Name}Config::shared_config();
        if (!isset($cfg["feature"]["validate"])) {
            $this->markTestSkipped('feature not present in this SDK: validate');
        }
        $client = ${Name}SDK::test(null, ["feature" => ["validate" => ["active" => true]]]);
        $err = null;
        try {
            $client->${accessor}(null)->${bad.op}([${args}], null);
        } catch (\\Throwable $e) {
            $err = $e;
        }
        $this->assertSame('validate_failed', $err->sdk_code ?? null);
    }
`
}


// A list response is checked record by record, not entity by entity.
function validateListTest(model: Model, entity: ModelEntity, accessor: string): string {
  const seeds = validateSeeds(entity)
  if (null == seeds) {
    return ''
  }
  const Name = model.const.Name
  const seed = (rec: Record<string, any>) =>
    "['entity' => [" + formatPhpValue(entity.name) + " => ['v1' => [" +
    Object.entries(rec).map(([k, v]) => formatPhpValue(k) + ' => ' + formatPhpValue(v)).join(', ') +
    ']]]]'
  return `
    public function test_validate_list_response(): void
    {
        $cfg = ${Name}Config::shared_config();
        if (!isset($cfg["feature"]["validate"])) {
            $this->markTestSkipped('feature not present in this SDK: validate');
        }
        $opts = ["feature" => ["validate" => ["active" => true, "request" => false, "response" => true]]];
        $listed = ${Name}SDK::test(${seed(seeds.valid)}, $opts)->${accessor}(null)->list(null, null);
        $this->assertSame(['v1'], array_map(fn($ent) => $ent->data_get()['id'] ?? null, $listed));
${null == seeds.invalid ? '' : `        $err = null;
        try {
            ${Name}SDK::test(${seed(seeds.invalid)}, $opts)->${accessor}(null)->list(null, null);
        } catch (\\Throwable $e) {
            $err = $e;
        }
        $this->assertSame('validate_failed', $err->sdk_code ?? null);
`}    }
`
}


export {
  TestEntity
}
