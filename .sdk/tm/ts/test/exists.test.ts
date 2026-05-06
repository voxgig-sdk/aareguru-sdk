
import { test, describe } from 'node:test'
import { equal } from 'node:assert'


import { AareguruSDK } from '..'


describe('exists', async () => {

  test('test-mode', async () => {
    const testsdk = await AareguruSDK.test()
    equal(null !== testsdk, true)
  })

})
