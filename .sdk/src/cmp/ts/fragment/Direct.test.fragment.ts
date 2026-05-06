
const envlocal = __dirname + '/../../../.env.local'
require('dotenv').config({ quiet: true, path: [envlocal] })

import { test, describe } from 'node:test'
import assert from 'node:assert'


import { ProjectNameSDK } from '../../..'

import {
  envOverride,
} from '../../utility'


describe('EntityNameDirect', async () => {

  test('direct-exists', async () => {
    const sdk = new ProjectNameSDK({
      system: { fetch: async () => ({}) }
    })
    assert('function' === typeof sdk.direct)
    assert('function' === typeof sdk.prepare)
  })

  // <[SLOT:direct]>
})


// <[SLOT:directSetup]>
