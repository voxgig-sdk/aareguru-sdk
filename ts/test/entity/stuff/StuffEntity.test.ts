

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


loadEnvLocal(__dirname + '/../../../.env.local')


describe('StuffEntity', async () => {

  // Per-test live pacing. Delay is read from sdk-test-control.json's
  // `test.live.delayMs`; only sleeps when AAREGURU_TEST_LIVE=TRUE.
  afterEach(liveDelay('AAREGURU_TEST_LIVE'))

  test('instance', async () => {
    const testsdk = AareguruSDK.test()
    const ent = testsdk.Stuff()
    assert(null != ent)
  })


  test('basic', async (t) => {

    const live = 'TRUE' === process.env.AAREGURU_TEST_LIVE
    for (const op of ['load']) {
      if (!live && maybeSkipControl(t, 'entityOp', 'stuff.' + op, live)) return
    }

    
    const setup = basicSetup()
    if (setup.live) {
      return runLiveEntity(setup, {"active":true,"alias":{"field":{}},"fields":{},"name":"stuff","op":{"load":{"input":"data","name":"load","points":[{"a":true,"co":{"id":"GET /logs","source":"openapi3","version":2},"g":{"query":[{"a":true,"ex":"my.app.ch","k":"query","n":"app","or":"app","r":false,"t":"`$STRING`","index$":0},{"a":true,"ex":12,"k":"query","n":"line","or":"line","r":false,"t":"`$INTEGER`","index$":1},{"a":true,"ex":"v2018_bueber","k":"query","n":"service","or":"service","r":true,"t":"`$STRING`","index$":2},{"a":true,"ex":"1.0.42","k":"query","n":"version","or":"version","r":false,"t":"`$STRING`","index$":3}]},"k":"http","m":"GET","o":"/logs","q":{"exist":["app","line","service","version"]},"r":{},"s":[{"lit":"logs"}],"t":{"req":"`reqdata`","res":"`body`"},"index$":0},{"a":true,"co":{"id":"GET /rawdata","source":"openapi3","version":2},"g":{"query":[{"a":true,"ex":"my.app.ch","k":"query","n":"app","or":"app","r":false,"t":"`$STRING`","index$":0},{"a":true,"ex":"v2018_bueber","k":"query","n":"service","or":"service","r":true,"t":"`$STRING`","index$":1},{"a":true,"ex":"1.0.42","k":"query","n":"version","or":"version","r":false,"t":"`$STRING`","index$":2}]},"k":"http","m":"GET","o":"/rawdata","q":{"exist":["app","service","version"]},"r":{},"s":[{"lit":"rawdata"}],"t":{"req":"`reqdata`","res":"`body`"},"index$":1},{"a":true,"co":{"id":"GET /slack","source":"openapi3","version":2},"g":{},"k":"http","m":"GET","o":"/slack","q":{},"r":{},"s":[{"lit":"slack"}],"t":{"req":"`reqdata`","res":"`body`"},"index$":2}],"key$":"load"}},"relations":{"ancestors":[]},"key$":"stuff","name__orig":"stuff","Name":"Stuff","name_":"stuff","name-":"stuff","NAME":"STUFF","index$":1}, {"active":true,"entity":"stuff","key$":"BasicStuffFlow","kind":"basic","name":"BasicStuffFlow","param":{},"step":[{"a":true,"d":{},"i":{"ref":"stuff_ref01","srcdatavar":"stuff_ref01_data","suffix":"_dt0"},"m":{},"o":"load","s":[],"v":[{"apply":"TextFieldMark","def":{"mark":"Mark01-stuff_ref01"}}],"index$":0}]}, 'Stuff', {"GET /logs":{"protocol":"http","responses":{"200":{"description":"OK"}},"parameters":[{"name":"service","in":"query","description":"Interner Servicename","required":true,"schema":{"type":"string"},"example":"v2018_bueber","x-ref":"#/components/parameters/service","index$":0},{"name":"lines","in":"query","description":"Anzahl Zeilen","required":false,"schema":{"type":"integer","default":12},"x-ref":"#/components/parameters/lines","index$":1},{"name":"app","in":"query","description":"Optionaler App-Name.","schema":{"type":"string"},"example":"my.app.ch","x-ref":"#/components/parameters/app","index$":2},{"name":"version","in":"query","description":"Optionale Versionsnummer für diese App.","schema":{"type":"string"},"example":"1.0.42","x-ref":"#/components/parameters/version","index$":3}],"securitySource":"unspecified"},"GET /rawdata":{"protocol":"http","responses":{"200":{"description":"OK"}},"parameters":[{"name":"service","in":"query","description":"Interner Servicename","required":true,"schema":{"type":"string"},"example":"v2018_bueber","x-ref":"#/components/parameters/service","index$":0},{"name":"app","in":"query","description":"Optionaler App-Name.","schema":{"type":"string"},"example":"my.app.ch","x-ref":"#/components/parameters/app","index$":1},{"name":"version","in":"query","description":"Optionale Versionsnummer für diese App.","schema":{"type":"string"},"example":"1.0.42","x-ref":"#/components/parameters/version","index$":2}],"securitySource":"unspecified"},"GET /slack":{"protocol":"http","responses":{"200":{"description":"OK"}},"parameters":[],"securitySource":"unspecified"}})
    }
    const client = setup.client
    const struct = setup.struct

    const isempty = struct.isempty
    const select = struct.select

    let stuff_ref01_data = Object.values(setup.data.existing.stuff)[0] as any

    // LOAD
    const stuff_ref01_ent = client.Stuff()
    const stuff_ref01_match_dt0: any = {}
    const stuff_ref01_data_dt0 = (await stuff_ref01_ent.load(stuff_ref01_match_dt0)).data()
    assert(null != stuff_ref01_data_dt0)


  })
})



function basicSetup(extra?: any) {
  // TODO: fix test def options
  const options: any = {} // null

  // TODO: needs test utility to resolve path
  const entityDataFile =
    Path.resolve(__dirname, 
      '../../../../.sdk/test/entity/stuff/StuffTestData.json')

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
    ['stuff01','stuff02','stuff03'],
    {
      '`$PACK`': ['', {
        '`$KEY`': '`$COPY`',
        '`$VAL`': ['`$FORMAT`', 'upper', '`$COPY`']
      }]
    })

  const env = envOverride({
    'AAREGURU_TEST_STUFF_ENTID': idmap,
    'AAREGURU_TEST_LIVE': 'FALSE',
    'AAREGURU_TEST_EXPLAIN': 'FALSE',
  })

  idmap = env['AAREGURU_TEST_STUFF_ENTID']

  const live = 'TRUE' === env.AAREGURU_TEST_LIVE

  const transport = createLiveTransport()
  if (live) {
    const rawIds = process.env['AAREGURU_TEST_STUFF_ENTID']
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
  
