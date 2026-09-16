

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


describe('V2018Entity', async () => {

  // Per-test live pacing. Delay is read from sdk-test-control.json's
  // `test.live.delayMs`; only sleeps when AAREGURU_TEST_LIVE=TRUE.
  afterEach(liveDelay('AAREGURU_TEST_LIVE'))

  test('instance', async () => {
    const testsdk = AareguruSDK.test()
    const ent = testsdk.V2018()
    assert(null != ent)
  })


  test('basic', async (t) => {

    const live = 'TRUE' === process.env.AAREGURU_TEST_LIVE
    for (const op of ['load']) {
      if (!live && maybeSkipControl(t, 'entityOp', 'v2018.' + op, live)) return
    }

    
    const setup = basicSetup()
    if (setup.live) {
      return runLiveEntity(setup, {"active":true,"alias":{"field":{}},"fields":[],"name":"v2018","op":{"load":{"input":"data","name":"load","points":[{"active":true,"args":{"query":[{"active":true,"example":"my.app.ch","kind":"query","name":"app","orig":"app","reqd":false,"type":"`$STRING`","index$":0},{"active":true,"example":"bern","kind":"query","name":"city","orig":"city","reqd":true,"type":"`$STRING`","index$":1},{"active":true,"example":"2025-02-13","kind":"query","name":"end","orig":"end","reqd":true,"type":"`$STRING`","index$":2},{"active":true,"example":"2025-01-01","kind":"query","name":"start","orig":"start","reqd":true,"type":"`$STRING`","index$":3},{"active":true,"example":null,"kind":"query","name":"value","orig":"value","reqd":false,"type":"`$STRING`","index$":4},{"active":true,"example":"1.0.42","kind":"query","name":"version","orig":"version","reqd":false,"type":"`$STRING`","index$":5}]},"contract":{"id":"GET /v2018/history","json":"{\"parameters\":[{\"description\":\"Orts-Identifikator aus der Ortsliste. (Hier obligatorisch.)\",\"example\":\"bern\",\"in\":\"query\",\"name\":\"city\",\"required\":true,\"schema\":{\"type\":\"string\"}},{\"description\":\"Startdatum und -Zeit (UTC) in irgendeinem Format (ISO, Timestamp, yesterday, -1 day).\",\"examples\":{\"Datum\":{\"value\":\"2025-01-01\"},\"Vor einem Tag\":{\"value\":\"-1 day\"},\"Zeitstempel\":{\"value\":1234567890}},\"in\":\"query\",\"name\":\"start\",\"required\":true,\"schema\":{\"type\":\"string\"}},{\"description\":\"Enddatum und -Zeit (UTC) in irgendeinem Format (ISO, Timestamp, now).\",\"examples\":{\"Datum\":{\"value\":\"2025-02-13\"},\"Jetzt\":{\"value\":\"now\"},\"Zeitstempel\":{\"value\":1234567891}},\"in\":\"query\",\"name\":\"end\",\"required\":true,\"schema\":{\"type\":\"string\"}},{\"description\":\"Optionaler App-Name.\",\"example\":\"my.app.ch\",\"in\":\"query\",\"name\":\"app\",\"schema\":{\"type\":\"string\"}},{\"description\":\"Optionale Versionsnummer für diese App.\",\"example\":\"1.0.42\",\"in\":\"query\",\"name\":\"version\",\"schema\":{\"type\":\"string\"}},{\"description\":\"Optional kommata-separierte Wertenamen, adressiert mit gepunkteten Strings. Damit werden nur einzelne Werte (einer pro Zeile) extrahiert und die ganze Response als Text zurückgegeben.\",\"examples\":{\"Einzelner Wert\":{\"description\":\"Einzelner Wert (Für Methode current)\",\"value\":\"aare.temperature\"},\"Mehrere Werte\":{\"description\":\"Mehrere Werte (Für Methode current)\",\"value\":\"aare.temperature,aare.temperature_text,sun.sunlocations.0.timeleft\"},\"none\":{\"value\":null}},\"in\":\"query\",\"name\":\"values\",\"required\":false,\"schema\":{\"type\":\"string\"}}],\"protocol\":\"http\",\"responses\":{\"200\":{\"description\":\"OK\"}},\"securitySource\":\"unspecified\"}","source":"openapi3","version":1},"kind":"http","method":"GET","orig":"/v2018/history","segments":[{"lit":"v2018"},{"lit":"history"}],"select":{"$action":"history","exist":["app","city","end","start","value","version"]},"transform":{"req":"`reqdata`","res":"`body`"},"index$":0},{"active":true,"args":{"query":[{"active":true,"example":"my.app.ch","kind":"query","name":"app","orig":"app","reqd":false,"type":"`$STRING`","index$":0},{"active":true,"example":"bern","kind":"query","name":"city","orig":"city","reqd":false,"type":"`$STRING`","index$":1},{"active":true,"example":null,"kind":"query","name":"value","orig":"value","reqd":false,"type":"`$STRING`","index$":2},{"active":true,"example":"1.0.42","kind":"query","name":"version","orig":"version","reqd":false,"type":"`$STRING`","index$":3}]},"contract":{"id":"GET /v2018/current","json":"{\"parameters\":[{\"description\":\"Orts-Identifikator aus der Ortsliste.\",\"example\":\"bern\",\"in\":\"query\",\"name\":\"city\",\"schema\":{\"default\":\"bern\",\"type\":\"string\"}},{\"description\":\"Optionaler App-Name.\",\"example\":\"my.app.ch\",\"in\":\"query\",\"name\":\"app\",\"schema\":{\"type\":\"string\"}},{\"description\":\"Optionale Versionsnummer für diese App.\",\"example\":\"1.0.42\",\"in\":\"query\",\"name\":\"version\",\"schema\":{\"type\":\"string\"}},{\"description\":\"Optional kommata-separierte Wertenamen, adressiert mit gepunkteten Strings. Damit werden nur einzelne Werte (einer pro Zeile) extrahiert und die ganze Response als Text zurückgegeben.\",\"examples\":{\"Einzelner Wert\":{\"description\":\"Einzelner Wert (Für Methode current)\",\"value\":\"aare.temperature\"},\"Mehrere Werte\":{\"description\":\"Mehrere Werte (Für Methode current)\",\"value\":\"aare.temperature,aare.temperature_text,sun.sunlocations.0.timeleft\"},\"none\":{\"value\":null}},\"in\":\"query\",\"name\":\"values\",\"required\":false,\"schema\":{\"type\":\"string\"}}],\"protocol\":\"http\",\"responses\":{\"200\":{\"description\":\"OK\"}},\"securitySource\":\"unspecified\"}","source":"openapi3","version":1},"kind":"http","method":"GET","orig":"/v2018/current","segments":[{"lit":"v2018"},{"lit":"current"}],"select":{"$action":"current","exist":["app","city","value","version"]},"transform":{"req":"`reqdata`","res":"`body`"},"index$":1},{"active":true,"args":{"query":[{"active":true,"example":"my.app.ch","kind":"query","name":"app","orig":"app","reqd":false,"type":"`$STRING`","index$":0},{"active":true,"example":"bern","kind":"query","name":"city","orig":"city","reqd":false,"type":"`$STRING`","index$":1},{"active":true,"example":null,"kind":"query","name":"value","orig":"value","reqd":false,"type":"`$STRING`","index$":2},{"active":true,"example":"1.0.42","kind":"query","name":"version","orig":"version","reqd":false,"type":"`$STRING`","index$":3}]},"contract":{"id":"GET /v2018/today","json":"{\"parameters\":[{\"description\":\"Orts-Identifikator aus der Ortsliste.\",\"example\":\"bern\",\"in\":\"query\",\"name\":\"city\",\"schema\":{\"default\":\"bern\",\"type\":\"string\"}},{\"description\":\"Optionaler App-Name.\",\"example\":\"my.app.ch\",\"in\":\"query\",\"name\":\"app\",\"schema\":{\"type\":\"string\"}},{\"description\":\"Optionale Versionsnummer für diese App.\",\"example\":\"1.0.42\",\"in\":\"query\",\"name\":\"version\",\"schema\":{\"type\":\"string\"}},{\"description\":\"Optional kommata-separierte Wertenamen, adressiert mit gepunkteten Strings. Damit werden nur einzelne Werte (einer pro Zeile) extrahiert und die ganze Response als Text zurückgegeben.\",\"examples\":{\"Einzelner Wert\":{\"description\":\"Einzelner Wert (Für Methode current)\",\"value\":\"aare.temperature\"},\"Mehrere Werte\":{\"description\":\"Mehrere Werte (Für Methode current)\",\"value\":\"aare.temperature,aare.temperature_text,sun.sunlocations.0.timeleft\"},\"none\":{\"value\":null}},\"in\":\"query\",\"name\":\"values\",\"required\":false,\"schema\":{\"type\":\"string\"}}],\"protocol\":\"http\",\"responses\":{\"200\":{\"description\":\"OK\"}},\"securitySource\":\"unspecified\"}","source":"openapi3","version":1},"kind":"http","method":"GET","orig":"/v2018/today","segments":[{"lit":"v2018"},{"lit":"today"}],"select":{"$action":"today","exist":["app","city","value","version"]},"transform":{"req":"`reqdata`","res":"`body`"},"index$":2},{"active":true,"args":{"query":[{"active":true,"example":"my.app.ch","kind":"query","name":"app","orig":"app","reqd":false,"type":"`$STRING`","index$":0},{"active":true,"example":null,"kind":"query","name":"value","orig":"value","reqd":false,"type":"`$STRING`","index$":1},{"active":true,"example":"1.0.42","kind":"query","name":"version","orig":"version","reqd":false,"type":"`$STRING`","index$":2}]},"contract":{"id":"GET /v2018/cities","json":"{\"parameters\":[{\"description\":\"Optionaler App-Name.\",\"example\":\"my.app.ch\",\"in\":\"query\",\"name\":\"app\",\"schema\":{\"type\":\"string\"}},{\"description\":\"Optionale Versionsnummer für diese App.\",\"example\":\"1.0.42\",\"in\":\"query\",\"name\":\"version\",\"schema\":{\"type\":\"string\"}},{\"description\":\"Optional kommata-separierte Wertenamen, adressiert mit gepunkteten Strings. Damit werden nur einzelne Werte (einer pro Zeile) extrahiert und die ganze Response als Text zurückgegeben.\",\"examples\":{\"Einzelner Wert\":{\"description\":\"Einzelner Wert (Für Methode current)\",\"value\":\"aare.temperature\"},\"Mehrere Werte\":{\"description\":\"Mehrere Werte (Für Methode current)\",\"value\":\"aare.temperature,aare.temperature_text,sun.sunlocations.0.timeleft\"},\"none\":{\"value\":null}},\"in\":\"query\",\"name\":\"values\",\"required\":false,\"schema\":{\"type\":\"string\"}}],\"protocol\":\"http\",\"responses\":{\"200\":{\"description\":\"OK\"}},\"securitySource\":\"unspecified\"}","source":"openapi3","version":1},"kind":"http","method":"GET","orig":"/v2018/cities","segments":[{"lit":"v2018"},{"lit":"cities"}],"select":{"$action":"city","exist":["app","value","version"]},"transform":{"req":"`reqdata`","res":"`body`"},"index$":3},{"active":true,"args":{"query":[{"active":true,"example":"my.app.ch","kind":"query","name":"app","orig":"app","reqd":false,"type":"`$STRING`","index$":0},{"active":true,"example":null,"kind":"query","name":"value","orig":"value","reqd":false,"type":"`$STRING`","index$":1},{"active":true,"example":"1.0.42","kind":"query","name":"version","orig":"version","reqd":false,"type":"`$STRING`","index$":2}]},"contract":{"id":"GET /v2018/widget","json":"{\"parameters\":[{\"description\":\"Optionaler App-Name.\",\"example\":\"my.app.ch\",\"in\":\"query\",\"name\":\"app\",\"schema\":{\"type\":\"string\"}},{\"description\":\"Optionale Versionsnummer für diese App.\",\"example\":\"1.0.42\",\"in\":\"query\",\"name\":\"version\",\"schema\":{\"type\":\"string\"}},{\"description\":\"Optional kommata-separierte Wertenamen, adressiert mit gepunkteten Strings. Damit werden nur einzelne Werte (einer pro Zeile) extrahiert und die ganze Response als Text zurückgegeben.\",\"examples\":{\"Einzelner Wert\":{\"description\":\"Einzelner Wert (Für Methode current)\",\"value\":\"aare.temperature\"},\"Mehrere Werte\":{\"description\":\"Mehrere Werte (Für Methode current)\",\"value\":\"aare.temperature,aare.temperature_text,sun.sunlocations.0.timeleft\"},\"none\":{\"value\":null}},\"in\":\"query\",\"name\":\"values\",\"required\":false,\"schema\":{\"type\":\"string\"}}],\"protocol\":\"http\",\"responses\":{\"200\":{\"description\":\"OK\"}},\"securitySource\":\"unspecified\"}","source":"openapi3","version":1},"kind":"http","method":"GET","orig":"/v2018/widget","segments":[{"lit":"v2018"},{"lit":"widget"}],"select":{"$action":"widget","exist":["app","value","version"]},"transform":{"req":"`reqdata`","res":"`body`"},"index$":4}],"key$":"load"}},"relations":{"ancestors":[]},"key$":"v2018","name__orig":"v2018","Name":"V2018","name_":"v2018","name-":"v2018","NAME":"V2018","index$":2}, {"active":true,"entity":"v2018","key$":"BasicV2018Flow","kind":"basic","name":"BasicV2018Flow","param":{},"step":[{"active":true,"data":{},"input":{"ref":"v2018_ref01","srcdatavar":"v2018_ref01_data","suffix":"_dt0"},"match":{},"op":"load","spec":[],"valid":[{"apply":"TextFieldMark","def":{"mark":"Mark01-v2018_ref01"}}],"index$":0}]}, 'V2018')
    }
    const client = setup.client
    const struct = setup.struct

    const isempty = struct.isempty
    const select = struct.select

    let v2018_ref01_data = Object.values(setup.data.existing.v2018)[0] as any

    // LOAD
    const v2018_ref01_ent = client.V2018()
    const v2018_ref01_match_dt0: any = {}
    const v2018_ref01_data_dt0 = (await v2018_ref01_ent.load(v2018_ref01_match_dt0)).data()
    assert(null != v2018_ref01_data_dt0)


  })
})



function basicSetup(extra?: any) {
  // TODO: fix test def options
  const options: any = {} // null

  // TODO: needs test utility to resolve path
  const entityDataFile =
    Path.resolve(__dirname, 
      '../../../../.sdk/test/entity/v2018/V2018TestData.json')

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
    ['v201801','v201802','v201803'],
    {
      '`$PACK`': ['', {
        '`$KEY`': '`$COPY`',
        '`$VAL`': ['`$FORMAT`', 'upper', '`$COPY`']
      }]
    })

  const env = envOverride({
    'AAREGURU_TEST_V2018_ENTID': idmap,
    'AAREGURU_TEST_LIVE': 'FALSE',
    'AAREGURU_TEST_EXPLAIN': 'FALSE',
  })

  idmap = env['AAREGURU_TEST_V2018_ENTID']

  const live = 'TRUE' === env.AAREGURU_TEST_LIVE

  const transport = createLiveTransport()
  if (live) {
    const rawIds = process.env['AAREGURU_TEST_V2018_ENTID']
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
  
