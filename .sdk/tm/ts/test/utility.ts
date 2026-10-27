
import * as Fs from 'node:fs'
import * as Path from 'node:path'


function makeStepData(dm: Record<string, any>, stepname: string): Record<string, any> {
  dm.s[stepname] = {
    entity: undefined,
    match: undefined,
    reqdata: undefined,
    resdata: undefined,
  }
  return dm.s[stepname]
}


// Transforms and creates a match object using the provided transform function
function makeMatch(
  dm: Record<string, any>,
  transform: Function,
  match: any
): Record<string, any> {
  return transform({}, match, { meta: { dm } })
}


// Transforms and creates request data using the provided transform function
function makeReqdata(
  dm: Record<string, any>,
  transform: Function,
  data: any
): Record<string, any> {
  return transform({}, data, { meta: { dm } })
}


function makeValid(
  dm: Record<string, any>,
  validate: Function,
  data: any,
  valid: any
): Record<string, any> {
  valid["`$OPEN`"] = true
  return validate(data, valid, { meta: { '`$EXISTS`': true, dm } })
}


function makeCtrl(explain: boolean) {
  return explain ? { explain: {} } : undefined
}

function envOverride(m: Record<string, any>) {
  if (
    'TRUE' === process.env.PROJECTENV_TEST_LIVE ||
    'TRUE' === process.env.PROJECTENV_TEST_OVERRIDE
  ) {
    Object.entries(m).map(n => {
      let envval = process.env[n[0]]
      if (null != envval) {
        envval = envval.trim()
        m[n[0]] = envval.startsWith('{') ? JSON.parse(envval) : envval
      }
    })
  }

  m.PROJECTENV_TEST_EXPLAIN = process.env.PROJECTENV_TEST_EXPLAIN || m.PROJECTENV_TEST_EXPLAIN

  return m
}


// Loads sdk-test-control.json (cached). Returns an empty-skip object if
// the file is missing or unparsable so tests never crash on a bad config.
type TestControl = {
  version?: number
  test?: {
    skip?: {
      live?: { direct?: any[], entityOp?: any[] }
      unit?: { direct?: any[], entityOp?: any[] }
      definition?: { direct?: any[], entityOp?: any[] }
    }
    live?: { delayMs?: number }
    client?: { options?: Record<string, any> }
    [k: string]: any
  }
  [k: string]: any
}

let _testControlCache: TestControl | null = null

function loadTestControl(): TestControl {
  if (_testControlCache) return _testControlCache
  const ctrlPath = Path.resolve(__dirname, '../test/sdk-test-control.json')
  try {
    _testControlCache = JSON.parse(Fs.readFileSync(ctrlPath, 'utf8')) as TestControl
  }
  catch {
    _testControlCache = {
      version: 1,
      test: { skip: { live: { direct: [], entityOp: [] }, unit: { direct: [], entityOp: [] } } }
    }
  }
  return _testControlCache!
}


// Returns the skip decision for a given test name from sdk-test-control.json.
// `kind` is 'direct' (matches by `test` field) or 'entityOp' (matches by
// `entity` + `op`). `mode` is 'live', 'unit' or 'definition'.
function isControlSkipped(
  kind: 'direct' | 'entityOp',
  name: string,
  mode: 'live' | 'unit' | 'definition'
): { skip: boolean, reason?: string } {
  const ctrl = loadTestControl()
  const list = ctrl?.test?.skip?.[mode]?.[kind] ?? []
  for (const e of list) {
    if (kind === 'direct' && e?.test === name) {
      return { skip: true, reason: e.reason }
    }
    if (kind === 'entityOp') {
      const key = (e?.entity ?? '') + '.' + (e?.op ?? '')
      if (key === name) return { skip: true, reason: e.reason }
    }
  }
  return { skip: false }
}


// Skips the current test if sdk-test-control.json lists it. Returns true
// when skipped (caller should `return` immediately).
function maybeSkipControl(
  t: any,
  kind: 'direct' | 'entityOp',
  name: string,
  live: boolean
): boolean {
  const decision = isControlSkipped(kind, name, live ? 'live' : 'unit')
  if (decision.skip) {
    t.skip(decision.reason || 'skipped via sdk-test-control.json')
    return true
  }
  return false
}


// A live test without the ids its request needs is blocked rather than sent
// with `undefined` in a path or query parameter. Returns true when skipped.
function skipIfMissingIds(t: any, setup: any, requiredKeys: string[], strict = true): boolean {
  if (!setup.live) return false
  const missing = requiredKeys.filter(k => null == setup.idmap?.[k])
  return 0 < missing.length &&
    liveMiss(t, strict, `Live test blocked: needs ${missing.join(', ')} via *_ENTID env var`)
}


// A live check that did not pass: strict fails the test, lenient skips it.
function liveMiss(t: any, strict: boolean, reason: string): boolean {
  if (strict) throw new Error(reason)
  t.skip(reason)
  return true
}


// An empty list is a valid answer, so a test needing a record skips.
function liveEmpty(t: any, reason: string): boolean {
  t.skip(reason)
  return true
}


// The SDK's error, already bounded and cleaned, or else status and content type.
function describeLive(result: any): string {
  const err = result?.err
  if (null != err) {
    return String(err.message || err.code || err)
  }
  const headers = result?.headers
  const type = 'function' === typeof headers?.get ? headers.get('content-type') :
    Object.entries(headers || {}).find(([k]) => 'content-type' === k.toLowerCase())?.[1]
  return 'HTTP ' + result?.status + (type ? ' ' + String(type).split(';')[0] : '')
}


const LIVE_RESERVED = ['base', 'prefix', 'suffix', 'server', 'apikey', 'secret']

function liveClientOptions(): Record<string, any> {
  const opts = loadTestControl()?.test?.client?.options

  if (null == opts || 'object' !== typeof opts) {
    return {}
  }

  const out: Record<string, any> = {}
  for (const key of Object.keys(opts)) {
    if (!LIVE_RESERVED.includes(key)) {
      out[key] = (opts as any)[key]
    }
  }

  return out
}


// Per-test live pacing delay (ms). Read from sdk-test-control.json
// `test.live.delayMs`; defaults to 500ms if absent or invalid.
function liveDelayMs(): number {
  const ctrl = loadTestControl()
  const v = ctrl?.test?.live?.delayMs
  return ('number' === typeof v && v >= 0) ? v : 500
}


// afterEach hook helper for live pacing. Generated tests register this
// via `afterEach(liveDelay(<envVar>))`; it sleeps `liveDelayMs()` only
// when the SDK's *_TEST_LIVE env var is set.
function liveDelay(liveEnvVar: string): () => Promise<void> {
  return async () => {
    if ('TRUE' === process.env[liveEnvVar]) {
      await new Promise(r => setTimeout(r, liveDelayMs()))
    }
  }
}


function loadEnvLocal(file: string): void {
  let text: string
  try {
    text = Fs.readFileSync(file, 'utf8')
  }
  catch (err: any) {
    if ('ENOENT' === err.code) {
      return
    }
    throw err
  }

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()

    if ('' === line || line.startsWith('#')) {
      continue
    }

    const eq = line.indexOf('=')
    if (0 >= eq) {
      continue
    }

    const key = line.slice(0, eq).trim().replace(/^export\s+/, '')
    let val = line.slice(eq + 1).trim()

    const quote = ("'" === val[0] || '"' === val[0]) ? val[0] : ''

    if ('' !== quote) {
      // Quoted: the value runs to the CLOSING quote, and a '#' inside it is
      // part of the value. Anything after the closing quote is a comment.
      const close = val.indexOf(quote, 1)
      val = 0 < close ? val.slice(1, close) : val.slice(1)
    }
    else {
      // Unquoted: the first '#' starts an inline comment, with or without
      // preceding whitespace — `A=a#b` is `a` to dotenv, not `a#b`.
      // Dropping this made `KEY=secret # note` resolve to the whole string
      // including the note, and a generated live test would then send that
      // as the credential. Verified against dotenv's own parse().
      const hash = val.indexOf('#')
      if (0 <= hash) {
        val = val.slice(0, hash)
      }
      val = val.trim()
    }

    if (undefined === process.env[key]) {
      process.env[key] = val
    }
  }
}


export {
  makeStepData,
  makeMatch,
  makeReqdata,
  makeValid,
  makeCtrl,
  envOverride,
  loadTestControl,
  isControlSkipped,
  maybeSkipControl,
  skipIfMissingIds,
  liveMiss,
  liveEmpty,
  describeLive,
  liveClientOptions,
  liveDelayMs,
  liveDelay,
  loadEnvLocal,
}
