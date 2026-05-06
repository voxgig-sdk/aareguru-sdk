
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


describe('V2018Entity', async () => {

  test('instance', async () => {
    const testsdk = AareguruSDK.test()
    const ent = testsdk.V2018()
    assert(null != ent)
  })


  test('basic', async () => {

    const setup = basicSetup()
    const client = setup.client
    const struct = setup.struct

    const isempty = struct.isempty
    const select = struct.select

    let v2018_ref01_data = Object.values(setup.data.existing.v2018)[0] as any

    // LOAD
    const v2018_ref01_ent = client.V2018()
    const v2018_ref01_match_dt0: any = {}
    v2018_ref01_match_dt0.id = v2018_ref01_data.id
    const v2018_ref01_data_dt0 = await v2018_ref01_ent.load(v2018_ref01_match_dt0)
    assert(v2018_ref01_data_dt0.id === v2018_ref01_data.id)


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
    'AAREGURU_TEST_V_____ENTID': idmap,
    'AAREGURU_TEST_LIVE': 'FALSE',
    'AAREGURU_TEST_EXPLAIN': 'FALSE',
    'AAREGURU_APIKEY': 'NONE',
  })

  idmap = env['AAREGURU_TEST_V_____ENTID']

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
  
