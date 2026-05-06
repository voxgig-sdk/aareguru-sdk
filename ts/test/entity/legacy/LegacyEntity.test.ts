
const envlocal = __dirname + '/../../../.env.local'
require('dotenv').config({ quiet: true, path: [envlocal] })

import Path from 'node:path'
import * as Fs from 'node:fs'

import { test, describe } from 'node:test'
import assert from 'node:assert'


import { AareguruSDK, BaseFeature, stdutil } from '../../..'

import {
  envOverride,
  makeCtrl,
  makeMatch,
  makeReqdata,
  makeStepData,
  makeValid,
} from '../../utility'


describe('LegacyEntity', async () => {

  test('instance', async () => {
    const testsdk = AareguruSDK.test()
    const ent = testsdk.Legacy()
    assert(null != ent)
  })


  test('basic', async () => {

    const setup = basicSetup()
    const client = setup.client
    const struct = setup.struct

    const isempty = struct.isempty
    const select = struct.select

    let legacy_ref01_data = Object.values(setup.data.existing.legacy)[0] as any

    // LOAD
    const legacy_ref01_ent = client.Legacy()
    const legacy_ref01_match_dt0: any = {}
    legacy_ref01_match_dt0.id = legacy_ref01_data.id
    const legacy_ref01_data_dt0 = await legacy_ref01_ent.load(legacy_ref01_match_dt0)
    assert(legacy_ref01_data_dt0.id === legacy_ref01_data.id)


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
    'AAREGURU_APIKEY': 'NONE',
  })

  idmap = env['AAREGURU_TEST_LEGACY_ENTID']

  if ('TRUE' === env.AAREGURU_TEST_LIVE) {
    client = new AareguruSDK(merge([
      {
        apikey: env.AAREGURU_APIKEY,
      },
      extra
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
    now: Date.now(),
  }

  return setup
}
  
