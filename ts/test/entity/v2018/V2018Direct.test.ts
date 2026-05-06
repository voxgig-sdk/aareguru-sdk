
const envlocal = __dirname + '/../../../.env.local'
require('dotenv').config({ quiet: true, path: [envlocal] })

import { test, describe } from 'node:test'
import assert from 'node:assert'


import { AareguruSDK } from '../../..'

import {
  envOverride,
} from '../../utility'


describe('V2018Direct', async () => {

  test('direct-exists', async () => {
    const sdk = new AareguruSDK({
      system: { fetch: async () => ({}) }
    })
    assert('function' === typeof sdk.direct)
    assert('function' === typeof sdk.prepare)
  })


  test('direct-load-v2018', async () => {
    const setup = directSetup({ id: 'direct01' })
    const { client, calls } = setup

    const params: any = {}
    if (!setup.live) {

    }

    const result: any = await client.direct({
      path: 'v2018/history',
      method: 'GET',
      params,
    })

    assert(result.ok === true)
    assert(result.status === 200)
    assert(null != result.data)

    if (!setup.live) {
      assert(result.data.id === 'direct01')
      assert(calls.length === 1)
      assert(calls[0].init.method === 'GET')
    }
  })

})



function directSetup(mockres?: any) {
  const calls: any[] = []

  const env = envOverride({
    'AAREGURU_TEST_V_____ENTID': {},
    'AAREGURU_TEST_LIVE': 'FALSE',
    'AAREGURU_APIKEY': 'NONE',
  })

  const live = 'TRUE' === env.AAREGURU_TEST_LIVE

  if (live) {
    const client = new AareguruSDK({
      apikey: env.AAREGURU_APIKEY,
    })

    let idmap: any = env['AAREGURU_TEST_V_____ENTID']
    if ('string' === typeof idmap && idmap.startsWith('{')) {
      idmap = JSON.parse(idmap)
    }

    return { client, calls, live, idmap }
  }

  const mockFetch = async (url: string, init: any) => {
    calls.push({ url, init })
    return {
      status: 200,
      statusText: 'OK',
      headers: {},
      json: async () => (null != mockres ? mockres : { id: 'direct01' }),
    }
  }

  const client = new AareguruSDK({
    base: 'http://localhost:8080',
    system: { fetch: mockFetch },
  })

  return { client, calls, live, idmap: {} as any }
}
  
