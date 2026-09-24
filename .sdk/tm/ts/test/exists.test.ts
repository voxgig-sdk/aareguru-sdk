
import { test, describe } from 'node:test'
import { equal } from 'node:assert'


import { AareguruSDK } from '..'


describe('exists', async () => {

  test('test-mode', () => {
    const testsdk = AareguruSDK.test()
    equal(testsdk instanceof AareguruSDK, true,
      'AareguruSDK.test() must return a client synchronously')
  })

})
