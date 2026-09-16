

import Path from 'node:path'
import * as Fs from 'node:fs'

import { test, describe, afterEach } from 'node:test'
import assert from 'node:assert'
import { createLiveTransport } from '../../live-runner'
import { runLiveEntity } from '../../live-entity'


import { AareguruSDK, BaseFeature, stdutil } from '../../..'

import {
  envOverride,
  liveClientOptions,
  liveDelay,
  loadEnvLocal,
  makeCtrl,
  makeMatch,
  makeReqdata,
  makeStepData,
  makeValid,
  maybeSkipControl,
} from '../../utility'


// AFTER the imports on purpose: TypeScript hoists `import` above any
// statement in the emitted CommonJS, so a loader placed above them would
// run only after every imported module had already been evaluated - and
// anything reading process.env at module scope would miss these values.
loadEnvLocal(__dirname + '/../../../.env.local')


describe('LegacyEntity', async () => {

  // Per-test live pacing. Delay is read from sdk-test-control.json's
  // `test.live.delayMs`; only sleeps when AAREGURU_TEST_LIVE=TRUE.
  afterEach(liveDelay('AAREGURU_TEST_LIVE'))

  test('instance', async () => {
    const testsdk = AareguruSDK.test()
    const ent = testsdk.Legacy()
    assert(null != ent)
  })


  test('basic', async (t) => {

    const live = 'TRUE' === process.env.AAREGURU_TEST_LIVE
    for (const op of ['load']) {
      if (!live && maybeSkipControl(t, 'entityOp', 'legacy.' + op, live)) return
    }

    
    const setup = basicSetup()
    if (setup.live) {
      return runLiveEntity(setup, {"active":true,"alias":{"field":{}},"fields":[],"name":"legacy","op":{"load":{"input":"data","name":"load","points":[{"active":true,"args":{"query":[{"active":true,"example":"my.app.ch","kind":"query","name":"app","orig":"app","reqd":false,"type":"`$STRING`","index$":0},{"active":true,"example":"1.0.42","kind":"query","name":"version","orig":"version","reqd":false,"type":"`$STRING`","index$":1}]},"contract":{"id":"GET /current","json":"{\"parameters\":[{\"description\":\"Optionaler App-Name.\",\"example\":\"my.app.ch\",\"in\":\"query\",\"name\":\"app\",\"schema\":{\"type\":\"string\"}},{\"description\":\"Optionale Versionsnummer für diese App.\",\"example\":\"1.0.42\",\"in\":\"query\",\"name\":\"version\",\"schema\":{\"type\":\"string\"}}],\"protocol\":\"http\",\"responses\":{\"200\":{\"description\":\"OK\"}},\"securitySource\":\"unspecified\"}","source":"openapi3","version":1},"kind":"http","method":"GET","orig":"/current","segments":[{"lit":"current"}],"select":{"exist":["app","version"]},"transform":{"req":"`reqdata`","res":"`body`"},"index$":0},{"active":true,"args":{"query":[{"active":true,"example":"my.app.ch","kind":"query","name":"app","orig":"app","reqd":false,"type":"`$STRING`","index$":0},{"active":true,"example":"1.0.42","kind":"query","name":"version","orig":"version","reqd":false,"type":"`$STRING`","index$":1}]},"contract":{"id":"GET /currentV2","json":"{\"parameters\":[{\"description\":\"Optionaler App-Name.\",\"example\":\"my.app.ch\",\"in\":\"query\",\"name\":\"app\",\"schema\":{\"type\":\"string\"}},{\"description\":\"Optionale Versionsnummer für diese App.\",\"example\":\"1.0.42\",\"in\":\"query\",\"name\":\"version\",\"schema\":{\"type\":\"string\"}}],\"protocol\":\"http\",\"responses\":{\"200\":{\"description\":\"OK\"}},\"securitySource\":\"unspecified\"}","source":"openapi3","version":1},"kind":"http","method":"GET","orig":"/currentV2","segments":[{"lit":"currentV2"}],"select":{"exist":["app","version"]},"transform":{"req":"`reqdata`","res":"`body`"},"index$":1},{"active":true,"args":{"query":[{"active":true,"example":"my.app.ch","kind":"query","name":"app","orig":"app","reqd":false,"type":"`$STRING`","index$":0},{"active":true,"example":"1.0.42","kind":"query","name":"version","orig":"version","reqd":false,"type":"`$STRING`","index$":1}]},"contract":{"id":"GET /today","json":"{\"parameters\":[{\"description\":\"Optionaler App-Name.\",\"example\":\"my.app.ch\",\"in\":\"query\",\"name\":\"app\",\"schema\":{\"type\":\"string\"}},{\"description\":\"Optionale Versionsnummer für diese App.\",\"example\":\"1.0.42\",\"in\":\"query\",\"name\":\"version\",\"schema\":{\"type\":\"string\"}}],\"protocol\":\"http\",\"responses\":{\"200\":{\"description\":\"OK\"}},\"securitySource\":\"unspecified\"}","source":"openapi3","version":1},"kind":"http","method":"GET","orig":"/today","segments":[{"lit":"today"}],"select":{"exist":["app","version"]},"transform":{"req":"`reqdata`","res":"`body`"},"index$":2}],"key$":"load"}},"relations":{"ancestors":[]},"key$":"legacy","name__orig":"legacy","Name":"Legacy","name_":"legacy","name-":"legacy","NAME":"LEGACY","index$":0}, {"active":true,"entity":"legacy","key$":"BasicLegacyFlow","kind":"basic","name":"BasicLegacyFlow","param":{},"step":[{"active":true,"data":{},"input":{"ref":"legacy_ref01","srcdatavar":"legacy_ref01_data","suffix":"_dt0"},"match":{},"op":"load","spec":[],"valid":[{"apply":"TextFieldMark","def":{"mark":"Mark01-legacy_ref01"}}],"index$":0}]}, 'Legacy')
    }
    const client = setup.client
    const struct = setup.struct

    const isempty = struct.isempty
    const select = struct.select

    let legacy_ref01_data = Object.values(setup.data.existing.legacy)[0] as any

    // LOAD
    const legacy_ref01_ent = client.Legacy()
    const legacy_ref01_match_dt0: any = {}
    const legacy_ref01_data_dt0 = (await legacy_ref01_ent.load(legacy_ref01_match_dt0)).data()
    assert(null != legacy_ref01_data_dt0)


  })
})



function basicSetup(extra?: any) {
  // TODO: fix test def options
  const options: any = {} // null

  // TODO: needs test utility to resolve path
  const entityDataFile =
    Path.resolve(__dirname, 
      '../../../../.sdk/test/entity/legacy/LegacyTestData.json')

  // TODO: file ready util needed?
  const entityDataSource = Fs.readFileSync(entityDataFile).toString('utf8')

  // TODO: need a xlang JSON parse utility in voxgig/struct with better error msgs
  const entityData = JSON.parse(entityDataSource)

  options.entity = entityData.existing

  let client = AareguruSDK.test(options, extra)
  const struct = client.utility().struct
  const merge = struct.merge
  const transform = struct.transform

  let idmap = transform(
    ['legacy01','legacy02','legacy03'],
    {
      '`$PACK`': ['', {
        '`$KEY`': '`$COPY`',
        '`$VAL`': ['`$FORMAT`', 'upper', '`$COPY`']
      }]
    })

  const env = envOverride({
    'AAREGURU_TEST_LEGACY_ENTID': idmap,
    'AAREGURU_TEST_LIVE': 'FALSE',
    'AAREGURU_TEST_EXPLAIN': 'FALSE',
  })

  idmap = env['AAREGURU_TEST_LEGACY_ENTID']

  const live = 'TRUE' === env.AAREGURU_TEST_LIVE

  const transport = createLiveTransport()
  if (live) {
    const rawIds = process.env['AAREGURU_TEST_LEGACY_ENTID']
    idmap = rawIds && rawIds.trim() ? JSON.parse(rawIds) : {}
    if (!idmap || Array.isArray(idmap) || typeof idmap !== 'object') {
      throw new Error('Live ENTID must be a JSON object')
    }
    client = new AareguruSDK(merge([
      // FIRST, so the generated fields below win: sdk-test-control.json's
      // test.client.options adds to the live client, it does not redirect it.
      liveClientOptions(),
      {
      },
      // 'extra || {}', not a bare 'extra': struct.merge returns UNDEFINED when the
      // last entry is undefined, and basicSetup is normally called with no
      // argument at all - so a bare 'extra' silently discarded the apikey
      // and server values above and handed the SDK undefined. Harmless
      // while there was nothing in that object; not harmless now.
      extra || {},
      { system: { fetch: transport.fetch } }
    ]))
  }

  const setup = {
    idmap,
    env,
    options,
    client,
    struct,
    data: entityData,
    explain: 'TRUE' === env.AAREGURU_TEST_EXPLAIN,
    live,
    transport,
    now: Date.now(),
  }

  return setup
}
  
