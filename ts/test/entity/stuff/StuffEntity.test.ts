
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


describe('StuffEntity', async () => {

  test('instance', async () => {
    const testsdk = AareguruSDK.test()
    const ent = testsdk.Stuff()
    assert(null != ent)
  })


  test('basic', async () => {

    const setup = basicSetup()
    const client = setup.client
    const struct = setup.struct

    const isempty = struct.isempty
    const select = struct.select

    let stuff_ref01_data = Object.values(setup.data.existing.stuff)[0] as any

    // LOAD
    const stuff_ref01_ent = client.Stuff()
    const stuff_ref01_match_dt0: any = {}
    stuff_ref01_match_dt0.id = stuff_ref01_data.id
    const stuff_ref01_data_dt0 = await stuff_ref01_ent.load(stuff_ref01_match_dt0)
    assert(stuff_ref01_data_dt0.id === stuff_ref01_data.id)


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
    'AAREGURU_APIKEY': 'NONE',
  })

  idmap = env['AAREGURU_TEST_STUFF_ENTID']

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
  
