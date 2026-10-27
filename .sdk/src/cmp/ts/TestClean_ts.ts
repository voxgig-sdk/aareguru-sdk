import {
  cmp,
  File,
  Content,
  isAuthSuppressed,
  isHttpBasicAuth,
  resolveAuthIn,
  resolveAuthName,
} from '@voxgig/sdkgen'


// The canary sweep: every credential slot holds a distinctive value, every
// diagnostic feature this SDK ships is switched on with a capturing sink, a
// real operation runs through every outcome, and every string that leaves
// the SDK is searched for the canaries and their encoded forms. It also
// proves its own sensitivity: with clean switched off the canary MUST show.
const TestClean = cmp(function TestClean(props: any) {
  const { model } = props.ctx$

  const auth = {
    suppressed: isAuthSuppressed(model),
    where: resolveAuthIn(model),
    name: 'header' === resolveAuthIn(model)
      ? resolveAuthName(model).toLowerCase() : resolveAuthName(model),
    basic: isHttpBasicAuth(model),
  }

  File({ name: 'clean.test.ts' }, () => Content(render(auth)))
})


function render(auth: {
  suppressed: boolean, where: string, name: string, basic: boolean
}): string {
  return `import { test, describe } from 'node:test'
import { ok, equal, deepStrictEqual } from 'node:assert'
import { inspect } from 'node:util'

import { SDK, BaseFeature } from '..'
import { hasFeature } from './feature/harness'


// Generated: the credential's wire placement is fixed when the SDK is built.
const AUTH = ${JSON.stringify(auth)}

const CANARY = {
  apikey: 'CANARY-APIKEY-k9x2m7q4p1',
  secret: 'CANARY-SECRET-w3e8r5t2y6',
  header: 'CANARY-HEADER-z1x4c7v0b3',
  value: 'CANARY-VALUE-n5m8b2v9c4',
  config: 'CANARY-CONFIG-h6j3k8l2m5',
}

const MASK = '[redacted]'

// Every form a canary can travel in.
const FORMS: string[] = []
for (const v of Object.values(CANARY)) {
  FORMS.push(v, Buffer.from(v).toString('base64'), encodeURIComponent(v))
}
FORMS.push(Buffer.from(CANARY.apikey + ':' + CANARY.secret).toString('base64'))


type Sink = { name: string, text: string }


// Header maps keep the caller's spelling; the assertion should not care.
function header(map: any, name: string): any {
  for (const k of Object.keys(map || {})) {
    if (k.toLowerCase() === name.toLowerCase()) return map[k]
  }
  return undefined
}


function leaks(text: string): string[] {
  return FORMS.filter((f) => text.includes(f))
}


function forms(name: string, val: any): Sink[] {
  const out: Sink[] = []
  const push = (kind: string, fn: () => string) => {
    try { out.push({ name: name + ':' + kind, text: fn() }) } catch (_e) { }
  }
  push('json', () => JSON.stringify(val))
  push('string', () => String(val))
  push('inspect', () => inspect(val, { depth: 8 }))
  if (val instanceof Error) {
    push('message', () => String(val.message))
    push('stack', () => String(val.stack))
    push('props', () => inspect({ ...val }, { depth: 8 }))
  }
  return out
}


// Captures the serialised context from inside the pipeline: what a hook
// author would hand to a logger.
class CaptureFeature extends BaseFeature {
  name = 'capture'
  version = '0.0.1'
  active = true
  _sinks: Sink[]
  constructor(sinks: Sink[]) { super(); this._sinks = sinks }
  init() { }
  PreRequest(this: any, ctx: any) { this._sinks.push(...forms('ctx@PreRequest', ctx)) }
  PreResponse(this: any, ctx: any) { this._sinks.push(...forms('ctx@PreResponse', ctx)) }
  // The SDK's own error as a hook reads it, which an observability feature logs.
  PreUnexpected(this: any, ctx: any) {
    this._sinks.push(...forms('ctx@PreUnexpected', ctx))
    if (ctx.ctrl?.err instanceof Error) this._sinks.push(...forms('ctrl.err@PreUnexpected', ctx.ctrl.err))
  }
}


type Scenario = { name: string, respond: (url: string, fetchdef: any, ctx?: any) => any }

function response(status: number, data: any, headers?: Record<string, string>): any {
  const h: Record<string, string> = { 'content-type': 'application/json', ...(headers || {}) }
  return {
    status,
    statusText: status < 400 ? 'OK' : 'ERR',
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: {
      get(key: string) { return h[String(key).toLowerCase()] },
      forEach(cb: any) { Object.keys(h).forEach((k) => cb(h[k], k, this)) },
    },
  }
}

const SCENARIOS: Scenario[] = [
  { name: 'ok', respond: () => response(200, { id: 'i1', name: 'n1' },
    { 'x-session-token': 'RESP-TOKEN-a1b2c3d4e5' }) },
  { name: 'notfound', respond: () => response(404, { error: 'no such record' }) },
  { name: 'server', respond: () => response(500, { error: 'boom' }) },
  { name: 'transport', respond: (url: string) => {
    throw new Error('socket hang up (URL was: "' + url + '")')
  } },
  { name: 'notjson', respond: () => ({
    status: 200, statusText: 'OK',
    json: async () => { throw new Error('Unexpected token < in JSON') },
    text: async () => '<html>',
    headers: { get() { return undefined }, forEach() { } },
  }) },
  // The SDK's own error, its code quoting a registered value.
  { name: 'coded', respond: (_url: string, _fetchdef: any, ctx: any) => {
    throw ctx.error('denied_' + CANARY.apikey, 'coded failure')
  } },
  // fetch rejects a timed-out or aborted request with a DOMException, whose
  // message is a getter with no setter.
  { name: 'timeout', respond: (url: string) => {
    throw new DOMException('timed out sending ' + CANARY.apikey + ' (URL was: "' + url + '")', 'TimeoutError')
  } },
]


// Offline, as every generated suite is: the test OPTION resolves a required
// server variable to test-<name>, and installs no transport.
function offline(opts: any): any {
  return { ...opts, test: { active: true } }
}


// A client the sweep cannot build leaves nothing swept: a harness error, not a leak.
function construct(opts: any): any {
  try {
    return new (SDK as any)(offline(opts))
  }
  catch (err: any) {
    throw new Error('clean harness: the client could not be constructed, so nothing was swept: ' +
      (err?.message ?? String(err)))
  }
}


function makeSdk(scenario: Scenario, sinks: Sink[], cleanopts?: any, extra?: any[], auth?: any): any {
  const capture = (name: string) => (rec: any) => { sinks.push(...forms(name, rec)) }
  const feature: any = {}
  if (hasFeature('log')) {
    const logger: any = {}
    for (const level of ['trace', 'debug', 'info', 'warn', 'error', 'fatal']) {
      logger[level] = capture('log.' + level)
    }
    feature.log = { active: true, logger }
  }
  if (hasFeature('debug')) feature.debug = { active: true, onEntry: capture('debug') }
  if (hasFeature('audit')) feature.audit = { active: true, sink: capture('audit') }
  if (hasFeature('telemetry')) feature.telemetry = { active: true, exporter: capture('telemetry') }
  if (hasFeature('cost')) feature.cost = { active: true, sink: capture('cost') }
  if (hasFeature('metrics')) feature.metrics = { active: true }
  if (hasFeature('clienttrack')) feature.clienttrack = { active: true }

  const opts: any = {
    apikey: CANARY.apikey,
    secret: CANARY.secret,
    headers: { 'X-Custom-Token': CANARY.header },
    feature,
    extend: [new CaptureFeature(sinks), ...(extra || [])],
    utility: {
      fetcher: async (ctx: any, url: string, fetchdef: any) => scenario.respond(url, fetchdef, ctx),
    },
  }
  // null builds the client with no clean block at all, as most callers do.
  if (null !== cleanopts) opts.clean = { values: CANARY.value, ...(cleanopts || {}) }
  if (null != auth) opts.auth = auth
  return construct(opts)
}


// The first operation that completes against a plain 200: with no
// arguments, else with every path parameter its points declare filled in.
type Target = { accessor: string, op: string, match: any }

async function usableOp(): Promise<Target | null> {
  const plain = construct({
    apikey: CANARY.apikey,
    utility: { fetcher: async () => response(200, { id: 'i1' }) },
  })
  const entities: Record<string, any> = plain._rootctx.config.entity || {}
  const rank = (op: string) => (({ list: 0, load: 1 } as any)[op] ?? 2)
  for (const m of Object.getOwnPropertyNames(Object.getPrototypeOf(plain)).sort()) {
    if (!/^[A-Z]/.test(m) || 'function' !== typeof plain[m]) { continue }
    let inst: any
    try { inst = plain[m]() } catch (_e) { continue }
    if (null == inst || 'string' !== typeof inst.name || null == entities[inst.name]) { continue }
    const opdefs = entities[inst.name].op || {}
    for (const op of Object.keys(opdefs).sort((a, b) => rank(a) - rank(b))) {
      const filled: any = {}
      for (const point of opdefs[op].points || []) {
        for (const p of point?.args?.params || []) {
          if ('string' === typeof p?.name) filled[p.name] = 'p1'
        }
      }
      for (const match of [{}, filled]) {
        try {
          await plain[m]()[op]({ ...match }, {})
          return { accessor: m, op, match }
        }
        catch (_e) { continue }
      }
    }
  }
  return null
}


// A feature that throws from inside the pipeline, quoting the request it
// saw: an error makeError never handled.
class ThrowFeature extends BaseFeature {
  name = 'throwhook'
  version = '0.0.1'
  active = true
  _unexpected: boolean
  constructor(unexpected = false) { super(); this._unexpected = unexpected }
  init() { }
  PreResponse(this: any, ctx: any) {
    throw new Error('hook saw ' + JSON.stringify(ctx.spec))
  }
  // Fired from the operation's catch block, before its cleaning.
  PreUnexpected(this: any, ctx: any) {
    if (this._unexpected) throw new Error('hook saw ' + JSON.stringify(ctx.spec))
  }
}


// A stream that fails while the caller iterates it, quoting a credential.
class StreamThrowFeature extends BaseFeature {
  name = 'streamthrow'
  version = '0.0.1'
  active = true
  init() { }
  PreDone(this: any, ctx: any) {
    ctx.result.stream = async function* () { throw new Error('stream saw ' + CANARY.apikey) }
  }
}


// A stream that succeeds, so the pipeline's terminal step never runs.
class StreamOkFeature extends BaseFeature {
  name = 'streamok'
  version = '0.0.1'
  active = true
  init() { }
  PreDone(this: any, ctx: any) {
    const items = [].concat(ctx.result.resdata ?? [])
    ctx.result.stream = async function* () { yield* items }
  }
}


async function drive(sdk: any, target: Target, ctrl: any, sinks: Sink[]) {
  // A caller may keep the record it passed rather than read ctrl.explain.
  const held = ctrl.explain
  const entity = sdk[target.accessor]()
  let out: any = undefined
  let err: any = undefined
  try {
    out = await entity[target.op]({ ...target.match }, ctrl)
  }
  catch (e: any) {
    err = e
  }
  if (undefined !== err) sinks.push(...forms('error', err))
  if (undefined !== out) sinks.push(...forms('result', out))
  // Raw, as a caller copying the match into another query reads it.
  sinks.push(...forms('match', entity.match()))
  if (null != ctrl.explain) sinks.push(...forms('explain', ctrl.explain))
  if (null != held && held !== ctrl.explain) sinks.push(...forms('explain:held', held))
  return err
}


describe('clean', () => {
  test('no credential leaves the SDK in any form', async (t) => {
    const target = await usableOp()
    if (null == target) {
      return t.skip('no operation of this SDK completes against a plain 200; nothing to sweep')
    }

    const sinks: Sink[] = []
    const errors: Record<string, any> = {}
    const explains: Record<string, any> = {}

    for (const scenario of SCENARIOS) {
      for (const variant of [
        { name: 'throw', ctrl: () => ({}) },
        { name: 'explain', ctrl: () => ({ explain: {} }) },
        { name: 'nothrow', ctrl: () => ({ throw: false, explain: {} }) },
      ]) {
        const sdk = makeSdk(scenario, sinks)
        const ctrl: any = variant.ctrl()
        const err = await drive(sdk, target, ctrl, sinks)
        const key = scenario.name + '/' + variant.name
        if (null != err) errors[key] = err
        if (null != ctrl.explain) explains[key] = ctrl.explain
        sinks.push(...forms('sdk', sdk))
        sinks.push({ name: 'sdk:spread', text: inspect({ ...sdk }, { depth: 6 }) })
      }
    }

    // A name given at run time replaces the declared one: the match leaves
    // out whichever name prepareAuth placed.
    await drive(makeSdk(SCENARIOS[0], sinks, undefined, undefined, { name: 'zzcred' }),
      target, {}, sinks)

    // A credential mistyped as an object is rejected by validation, whose
    // message quotes the value it rejected; with and without a clean block.
    for (const cleanblock of [{ clean: { values: CANARY.value } }, {}]) {
      let rejected: any = undefined
      try {
        new (SDK as any)(offline({ apikey: { value: CANARY.apikey }, ...cleanblock }))
      }
      catch (e: any) {
        rejected = e
      }
      ok(null != rejected, 'a credential mistyped as an object should be rejected')
      sinks.push(...forms('rejected', rejected))
    }

    // An error a feature hook throws, quoting the request, skips makeError.
    for (const unexpected of [false, true]) {
      const hooked = makeSdk(SCENARIOS[0], sinks, undefined, [new ThrowFeature(unexpected)])
      const hookerr = await drive(hooked, target, { explain: {} }, sinks)
      ok(null != hookerr, 'the throwing hook should fail the operation')
    }

    // Iterating a stream runs inside the same catch path as the operation,
    // and the explain record the caller passed is cleaned however it ends.
    for (const [name, extra] of [['stream', [new StreamThrowFeature()]],
      ['stream-ok', [new StreamOkFeature()]], ['stream-plain', []]] as [string, any[]][]) {
      const streamed = makeSdk(SCENARIOS[0], sinks, undefined, extra)
      const explain = {}
      let streamerr: any = undefined
      try {
        for await (const _item of streamed[target.accessor]().stream(
          target.op, { reqmatch: { ...target.match } }, { ctrl: { explain } })) { }
      }
      catch (e: any) { streamerr = e }
      ok(('stream' === name) === (null != streamerr), name + ': only the failing stream throws')
      if (null != streamerr) sinks.push(...forms(name, streamerr))
      ok(0 < Object.keys(explain).length, name + ': the explain record was not filled')
      sinks.push(...forms(name + ':explain', explain))
    }

    // Most callers pass no clean block; the defaults alone must mask.
    for (const scenario of [SCENARIOS[1], SCENARIOS[3]]) {
      const bare = makeSdk(scenario, sinks, null)
      await drive(bare, target, { explain: {} }, sinks)
      sinks.push(...forms('bare', bare))
    }

    // The generated config's own clean block is read beside the caller's,
    // and is not changed by it.
    const util: any = makeSdk(SCENARIOS[0], sinks).utility()
    const cfgclean = { keys: 'zzsens', values: CANARY.config }
    const built = util.makeOptions({ utility: util, config: { options: { clean: cfgclean } },
      options: { clean: { values: CANARY.value } } })
    const seeded = util.clean({ options: built }, 'config ' + CANARY.config + ' caller ' + CANARY.value)
    sinks.push({ name: 'config-clean', text: seeded })

    // A feature's name is not a field name: only the sensitive names inside
    // its settings register. An entity block, of per-entity settings or seeded
    // records keyed by entity name and id, is not read at all, and nor are
    // rbac's rules, keyed by entity and operation names.
    const featured: any = construct({ apikey: CANARY.apikey, feature: {
      zzsecrets: { active: false, kind: 'PLAINSETTING-q8w2e4r6' },
      zzfeat: { active: false, apitoken: 'FEATTOKEN-z9y8x7w6' },
      rbac: { active: false, rules: { 'zztoken.load': 'PLAINRULE-k7j5h3g1' } },
      test: { active: false, entity: { zztoken: { ZZTOKEN01: { note: 'PLAINRECORD-t5r3e1w9' } } } },
    }, entity: { zztoken: { alias: { zzkey: 'PLAINALIAS-m2n4b6v8' } } } })
    const fctx = { options: featured._options }

    // The raw path returns its failure rather than throwing it, a
    // DOMException's included.
    const timedout = await makeSdk(SCENARIOS[SCENARIOS.length - 1], sinks).direct({ path: 'raw' })
    ok(false === timedout.ok && 'TimeoutError' === timedout.err?.name,
      'a timed-out transport should fail direct() with its own error')
    sinks.push(...forms('direct:timeout', timedout.err))
    const raw = await makeSdk(SCENARIOS[3], sinks).direct({ path: 'raw' })
    ok(false === raw.ok && null != raw.err, 'a transport failure should fail direct()')
    sinks.push(...forms('direct', raw.err))

    const leaked = sinks
      .map((s) => ({ name: s.name, found: leaks(s.text) }))
      .filter((s) => 0 < s.found.length)

    console.log('clean: swept ' + sinks.length + ' surface(s), ' + leaked.length + ' leak(s)')

    equal(leaked.length, 0, 'credential leaked through: ' +
      leaked.map((l) => l.name + ' [' + l.found.join(', ') + ']').join('; '))

    // A DOMException is masked in place, and stays the error it was.
    equal(errors['timeout/throw']?.name, 'TimeoutError', 'a timed-out operation should throw its own error')

    // The positive half: the slot the credential travelled in is masked,
    // and an unregistered token in a response header is masked by name.
    const notfound = errors['notfound/throw']
    ok(null != notfound, 'the 404 scenario must throw')
    equal(notfound.status, 404)
    if (!AUTH.suppressed) {
      const spec = notfound.spec || {}
      if ('query' === AUTH.where) {
        equal(header(spec.query, AUTH.name), MASK)
      }
      else if ('cookie' === AUTH.where) {
        ok(String(header(spec.headers, 'cookie')).includes(MASK), 'cookie: ' + header(spec.headers, 'cookie'))
      }
      else {
        ok(String(header(spec.headers, AUTH.name)).endsWith(MASK),
          AUTH.name + ': ' + header(spec.headers, AUTH.name))
      }
    }
    equal(header(notfound.spec.headers, 'x-custom-token'), MASK)

    equal(seeded, 'config ' + MASK + ' caller ' + MASK)
    deepStrictEqual(util.clean({ options: built }, { my_zzsens: 'x', other: 'y' }), { my_zzsens: MASK, other: 'y' })
    deepStrictEqual(cfgclean, { keys: 'zzsens', values: CANARY.config })

    equal(featured.utility().clean(fctx, 'kind PLAINSETTING-q8w2e4r6'), 'kind PLAINSETTING-q8w2e4r6')
    equal(featured.utility().clean(fctx, 'token FEATTOKEN-z9y8x7w6'), 'token ' + MASK)
    equal(featured.utility().clean(fctx, 'record PLAINRECORD-t5r3e1w9'), 'record PLAINRECORD-t5r3e1w9')
    equal(featured.utility().clean(fctx, 'alias PLAINALIAS-m2n4b6v8'), 'alias PLAINALIAS-m2n4b6v8')
    equal(featured.utility().clean(fctx, 'rule PLAINRULE-k7j5h3g1'), 'rule PLAINRULE-k7j5h3g1')

    const coded = errors['coded/throw']
    ok(null != coded, 'the coded scenario must throw')
    equal(coded.code, 'denied_' + MASK)

    const explained = explains['ok/explain'] || {}
    ok(null != explained.result, 'the explain record should carry the result')
    equal(header(explained.result.headers, 'x-session-token'), MASK)
  })


  test('the sweep can see a leak: clean switched off shows the credential', async (t) => {
    const target = await usableOp()
    if (null == target) {
      return t.skip('no operation of this SDK completes against a plain 200; nothing to sweep')
    }

    const sinks: Sink[] = []
    const sdk = makeSdk(SCENARIOS[1], sinks, { active: false })
    const err = await drive(sdk, target, {}, sinks)
    ok(null != err)

    // Explaining a failure must not cost it its error.
    const explained = await drive(makeSdk(SCENARIOS[1], [], { active: false }), target, { explain: {} }, [])
    equal(explained?.message, err.message, 'with clean off, explain lost the error')

    const leaked = sinks.filter((s) => 0 < leaks(s.text).length)
    ok(0 < leaked.length, 'with clean off, nothing showed the canary: the sweep is blind')

    if (!AUTH.suppressed) {
      const text = JSON.stringify(err.spec)
      ok(text.includes(CANARY.apikey) ||
        text.includes(Buffer.from(CANARY.apikey + ':' + CANARY.secret).toString('base64')),
        'the raw spec should carry the credential when clean is off')
    }
  })
})
`
}


export {
  TestClean
}
