
const envlocal = __dirname + '/../../../.env.local'
require('dotenv').config({ quiet: true, path: [envlocal] })

import { test, describe, afterEach } from 'node:test'
import assert from 'node:assert'


import { AareguruSDK } from '../../..'

import {
  envOverride,
  liveDelay,
  maybeSkipControl,
  skipIfMissingIds,
} from '../../utility'


describe('V2018Direct', async () => {

  // Per-test live pacing. Delay is read from sdk-test-control.json's
  // `test.live.delayMs`; only sleeps when AAREGURU_TEST_LIVE=TRUE.
  afterEach(liveDelay('AAREGURU_TEST_LIVE'))

  test('direct-exists', async () => {
    const sdk = new AareguruSDK({
      system: { fetch: async () => ({}) }
    })
    assert('function' === typeof sdk.direct)
    assert('function' === typeof sdk.prepare)
  })


  test('direct-load-v2018', async (t: any) => {
    const setup = directSetup({ id: 'direct01' })
    if (maybeSkipControl(t, 'direct', 'direct-load-v2018', setup.live)) return
    const { client, calls } = setup

    const params: any = {}
    const query: any = {}
    if (setup.live) {
      query.city = "bern"
      query.end = "2025-02-13"
      query.start = "2025-01-01"
    } else {

    }

    const result: any = await client.direct({
      path: 'v2018/history',
      method: 'GET',
      params,
      query,
    })

    if (setup.live) {
      // Live mode is lenient: synthetic IDs frequently 4xx. Skip rather
      // than fail when the load endpoint isn't reachable with the IDs we
      // can construct from setup.idmap.
      if (!result.ok || result.status < 200 || result.status >= 300) {
        return
      }
    } else {
      assert(result.ok === true)
      assert(result.status === 200)
      assert(null != result.data)
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
  })

  const live = 'TRUE' === env.AAREGURU_TEST_LIVE

  if (live) {
    const client = new AareguruSDK({
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

// direct() returns the raw response body. List endpoints often wrap the
// array in an envelope (e.g. { data: [...] }, { entities: [...] },
// { pagination, data: [...] }). The test transforms the raw body to
// extract the first array — either the body itself or the first array
// property of an envelope object.
function unwrapListData(data: any): any[] | null {
  if (Array.isArray(data)) return data
  if (data && 'object' === typeof data) {
    for (const v of Object.values(data)) {
      if (Array.isArray(v)) return v as any[]
    }
  }
  return null
}
  
