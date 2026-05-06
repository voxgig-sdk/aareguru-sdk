
const envlocal = __dirname + '/../../../.env.local'
require('dotenv').config({ quiet: true, path: [envlocal] })

import Path from 'node:path'
import * as Fs from 'node:fs'

import { test, describe } from 'node:test'
import assert from 'node:assert'


import { ProjectNameSDK, BaseFeature, stdutil } from '../../..'

import {
  envOverride,
  makeCtrl,
  makeMatch,
  makeReqdata,
  makeStepData,
  makeValid,
} from '../../utility'


describe('EntityNameEntity', async () => {

  test('instance', async () => {
    const testsdk = ProjectNameSDK.test()
    const ent = testsdk.EntityName()
    assert(null != ent)
  })


  test('basic', async () => {
    // <[SLOT:basic]>
  })
})


// <[SLOT:basicSetup]>
