// Execute every independent live step before deciding the suite's result.
// Values never appear in reports: they can contain credentials or API data.

type LiveState = 'passed' | 'failed' | 'blocked' | 'empty' | 'excluded'

type LiveRequest = {
  method: string
  path: string
  status?: number
  type?: string
  agent?: string
}

type LiveResult = {
  id: string
  state: LiveState
  attempted: boolean
  role?: string
  retention?: string
  reason?: string
  requests?: LiveRequest[]
}

type LiveContext = {
  values: Map<string, any>
  publish(value: any): void
  attempted(): void
  requests: LiveRequest[]
}

type LiveStep = {
  id: string
  needs?: string[]
  cleanup?: boolean
  role?: string
  retention?: string
  excluded?: string
  run(ctx: LiveContext): Promise<void>
}

class LiveBlocked extends Error {}

// The SDK fetcher's code for a write a GET-only run refused unsent.
const GETONLY_CODE = 'fetch_getonly_block'

// The account answered, but holds no record the step could act on.
class LiveEmpty extends Error {}

type LiveReport = {
  planned: number
  attempted: number
  passed: number
  failed: number
  blocked: number
  empty: number
  excluded: number
  results: LiveResult[]
}

// What main.kit.test.live.strict decides: a strict run fails a live test
// that did not succeed, a lenient one skips it with the reason.
type LiveSettle = {
  strict?: boolean
  t?: { skip(message?: string): void }
}

async function runLiveSteps(
  steps: LiveStep[],
  options: { delayMs?: number, report?: (result: LiveResult) => void } = {},
): Promise<LiveReport> {
  const values = new Map<string, any>()
  const results: LiveResult[] = []
  const ids = new Set<string>()
  for (const step of steps) {
    if (!step.id || ids.has(step.id)) throw new Error('Duplicate or empty live step id')
    ids.add(step.id)
  }

  const record = (result: LiveResult) => {
    const step = steps.find(step => step.id === result.id)
    if (step?.role) result.role = step.role
    if (step?.retention && result.attempted) result.retention = step.retention
    results.push(result)
    options.report?.(result)
  }

  // Cleanup runs after ordinary work, even if an assertion failed after a
  // resource was created. A step publishes usable data before assertions.
  for (const cleanup of [false, true]) {
    const pending = steps.filter(step => !!step.cleanup === cleanup)
    while (pending.length) {
      let progressed = false
      for (let i = 0; i < pending.length;) {
        const step = pending[i]
        const missing = (step.needs || []).filter(id => !values.has(id) ||
          (!cleanup && results.some(result => result.id === id && result.state !== 'passed')))
        if (!step.excluded && missing.some(id => pending.some(other => other.id === id))) {
          i++
          continue
        }
        pending.splice(i, 1)
        progressed = true
        if (step.excluded) {
          record({ id: step.id, state: 'excluded', attempted: false, reason: step.excluded })
          continue
        }
        if (missing.length) {
          record({ id: step.id, state: 'blocked', attempted: false,
            reason: 'Missing output: ' + missing.join(', ') })
          continue
        }
        let attempted = false
        const requests: LiveContext['requests'] = []
        try {
          await step.run({
            values,
            publish: value => { if (undefined !== value) values.set(step.id, value) },
            attempted: () => { attempted = true },
            requests,
          })
          if (!attempted) throw new LiveBlocked('No request attempted')
          record({ id: step.id, state: 'passed', attempted, requests })
        }
        catch (error) {
          const refused = GETONLY_CODE === (error as any)?.code
          const state: LiveState = error instanceof LiveEmpty ? 'empty'
            : error instanceof LiveBlocked || refused ? 'blocked' : 'failed'
          record({ id: step.id, state, attempted, requests,
            reason: refused ? 'Refused by the GET-only guard' :
              'failed' === state ? failureReason(error) : (error as Error).message })
        }
        if (attempted && (options.delayMs || 0) > 0) {
          await new Promise(resolve => setTimeout(resolve, options.delayMs))
        }
      }
      if (!progressed) {
        for (const step of pending.splice(0)) {
          record({ id: step.id, state: 'blocked', attempted: false,
            reason: 'Cyclic or unavailable dependency' })
        }
      }
    }
  }

  return {
    planned: steps.length,
    attempted: results.filter(result => result.attempted).length,
    passed: results.filter(result => result.state === 'passed').length,
    failed: results.filter(result => result.state === 'failed').length,
    blocked: results.filter(result => result.state === 'blocked').length,
    empty: results.filter(result => result.state === 'empty').length,
    excluded: results.filter(result => result.state === 'excluded').length,
    results,
  }
}

// An SDK error's code and an assertion's own fixed message say what went
// wrong without repeating a value; a message built from values could
// carry a header, a body or a token, so it is not reported.
function failureReason(error: any): string {
  if (null != error?.sdk && 'string' === typeof error.code) {
    return 'Request failed: ' + error.code
  }
  // Node appends the compared values to a custom assertion message.
  if ('ERR_ASSERTION' === error?.code && false === error.generatedMessage) {
    return 'Assertion failed: ' + String(error.message).split('\n')[0]
  }
  return 'Request or assertion failed'
}

function liveIncomplete(report: LiveReport): boolean {
  return 0 < report.failed || 0 < report.blocked || 0 === report.attempted
}

function assertLiveReport(report: LiveReport): void {
  if (liveIncomplete(report)) {
    throw new Error('Live coverage incomplete: ' + JSON.stringify(report))
  }
}

// An account with no record for a step to read skips in either mode, as
// does a run that leaves out every step.
function settleLiveReport(report: LiveReport, settle: LiveSettle = {}): void {
  if (0 < report.planned && report.excluded === report.planned && null != settle.t) {
    return settle.t.skip('Live coverage incomplete: ' + liveSummary(report))
  }
  if (liveIncomplete(report)) {
    if (false !== settle.strict || null == settle.t) return assertLiveReport(report)
    return settle.t.skip('Live coverage incomplete (main.kit.test.live.strict is false): ' +
      liveSummary(report))
  }
  if (0 < report.empty) settle.t?.skip('Live coverage incomplete: ' + liveSummary(report))
}

function liveSummary(report: LiveReport): string {
  const open = report.results.filter(result => 'passed' !== result.state)
  return 0 === open.length ? 'no request attempted' :
    open.map(result => result.id + ' ' + result.state +
      (result.reason ? ' (' + result.reason + ')' : '')).join('; ')
}

function createLiveTransport(timeoutMs = 30000) {
  let context: LiveContext | undefined
  const requests: LiveContext['requests'] = []
  const nativeFetch = globalThis.fetch
  return {
    requests,
    enter(next: LiveContext) { context = next },
    fetch: async (input: any, init?: any) => {
      const url = new URL(String(input))
      const method = String(init?.method || 'GET').toUpperCase()
      if ('TRUE' === process.env.VOXGIG_GETONLY_GUARD && 'GET' !== method) {
        throw Object.assign(new Error('[GET-ONLY GUARD] blocked ' + method + ' ' + url.pathname),
          { code: GETONLY_CODE })
      }
      // A credential can travel as the agent (auth.name), so only whether
      // the request carried one is recorded, never its value.
      const request: LiveRequest = {
        method: init?.method || 'GET', path: url.origin + url.pathname,
        agent: null == new Headers(init?.headers).get('user-agent') ? 'transport default' : 'configured',
      }
      requests.push(request)
      context?.requests.push(request)
      context?.attempted()
      if (!context) console.log('LIVE REQUEST ' + JSON.stringify(request))
      const timeout = AbortSignal.timeout(timeoutMs)
      const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout
      const response = await nativeFetch(input, { ...init, signal })
      request.status = response.status
      const type = response.headers.get('content-type')
      if (type) request.type = type.split(';')[0].trim()
      if (!context) console.log('LIVE RESPONSE ' + JSON.stringify(request))
      return response
    },
  }
}

export {
  runLiveSteps,
  assertLiveReport,
  settleLiveReport,
  liveSummary,
  LiveBlocked,
  LiveEmpty,
  createLiveTransport,
}
export type { LiveStep, LiveContext, LiveReport, LiveResult, LiveSettle }
