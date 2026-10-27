// Checks one operation against the API definition rather than the model the
// SDK was generated from. A mock transport answers with the definition's own
// response example, so nothing here depends on how the model reads it.

import assert from 'node:assert/strict'


type Credential = { in: string, name: string, scheme?: string }

type DefinitionPoint = {
  entity: string
  accessor: string
  op: string
  method: string
  path: string
  action?: string
  args: { name: string, wire: string, value: any }[]
  select: Record<string, any>
  headers?: { name: string, wire: string, value: any }[]
  cookies?: { name: string, wire: string, value: any }[]
  responseMedia?: string[]
  rawBody?: { media: string[], text: boolean }
  query: string[]
  queryArgs?: { name: string, wire: string }[]
  bodyArgs?: string[]
  auth: Credential[][] | null
  status: number
  sample: any
  idField: string
  ownQuery?: string
}


const KEY = 'definition-test-key'
const BASE = 'http://definition.test'

const RAW_TEXT = 'definition-test-body'
const RAW_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff])


async function runDefinitionPoint(SDK: any, point: DefinitionPoint): Promise<void> {
  const sent: { url: URL, init: any }[] = []
  const body = null == point.sample ? null : JSON.stringify(point.sample)

  const client = new SDK({
    apikey: KEY,
    base: BASE,
    feature: { test: { active: false } },
    system: {
      fetch: async (url: any, init: any) => {
        sent.push({ url: new URL(String(url)), init: init || {} })
        return new Response(204 === point.status ? null : body, {
          status: point.status,
          headers: { 'content-type': 'application/json' },
        })
      },
    },
  })

  const input: any = { ...point.select }
  for (const arg of point.args) input[arg.name] = arg.value
  for (const h of point.headers || []) input[h.name] = h.value
  for (const c of point.cookies || []) input[c.name] = c.value
  if (null != point.action) input.$action = point.action
  if (null != point.rawBody) input.$body = rawSample(point)

  let result: any
  let error: any
  try {
    result = await client[point.accessor]()[point.op](input)
  }
  catch (err) {
    error = err
  }

  assert.equal(sent.length, 1, 'expected one request, sent ' + sent.length +
    (error ? ': ' + (error as any).message : ''))
  const { url, init } = sent[0]

  assert.equal(String(init.method || 'GET').toUpperCase(), point.method, 'method')

  const route = point.path.replace(/\{([^}]+)\}/g, (_: string, name: string) => {
    const arg = point.args.find((a) => a.wire === name)
    return null == arg ? '{' + name + '}' : encodeURIComponent(String(arg.value))
  })
  // Read as the request was, so a backslash in the definition's path, as in
  // GitLab's `Packages\(\)`, is the slash the URL parser makes it.
  assert.equal(url.pathname, new URL(BASE + route).pathname, 'route')

  // Only what the definition declares, so never a path parameter again.
  const credentialQuery = (point.auth || []).flat()
    .filter((c) => 'query' === c.in).map((c) => c.name)
  // prepareAuth sends the key whether or not this operation applies its scheme.
  if (null != point.ownQuery) {
    credentialQuery.push(point.ownQuery)
  }
  for (const key of url.searchParams.keys()) {
    assert(point.query.includes(key) || credentialQuery.includes(key),
      'query parameter not in the definition: ' + key)
  }

  for (const q of point.queryArgs || []) {
    assert(url.searchParams.has(q.wire), 'query parameter not sent: ' + q.wire)
  }

  // From the apikey alone, placed as the definition's security scheme says.
  if (null != point.auth && 0 < point.auth.length) {
    const headers = new Headers(init.headers)
    assert(point.auth.some((set) => set.every((c) => placed(c, headers, url))),
      'credential not sent as the definition declares it: ' + JSON.stringify(point.auth))
  }

  // A header parameter goes out as a header. The credential check above owns
  // any header the security scheme names, and the SDK sets the content type
  // from the body it sends.
  const credentialHeaders = (point.auth || []).flat()
    .filter((c) => 'header' === c.in).map((c) => c.name.toLowerCase())
  for (const h of point.headers || []) {
    const wire = h.wire.toLowerCase()
    if (credentialHeaders.includes(wire) || 'content-type' === wire) continue
    const sentValue = new Headers(init.headers).get(wire)
    // A Cookie header argument is cookie pieces, which the cookie arguments and
    // the cookie credential join, each replacing the piece whose name it owns.
    if ('cookie' === wire) {
      const owned = (point.cookies || []).map((c) => c.wire).concat((point.auth || []).flat()
        .filter((c) => 'cookie' === c.in).map((c) => c.name))
      const pieces = String(sentValue ?? '').split(';').map((c) => c.trim())
      for (const piece of String(h.value).split(';').map((c) => c.trim()).filter((c) => '' !== c)) {
        if (owned.includes(piece.split('=')[0].trim())) continue
        assert(pieces.includes(piece), 'header parameter not sent as a header: ' + h.wire)
      }
      continue
    }
    assert.equal(sentValue, String(h.value), 'header parameter not sent as a header: ' + h.wire)
  }

  // A cookie parameter goes out in the cookie header as name=value, percent-encoded.
  const cookies = String(new Headers(init.headers).get('cookie') ?? '')
    .split(';').map((c) => c.trim())
  for (const c of point.cookies || []) {
    assert(cookies.includes(c.wire + '=' + encodeURIComponent(String(c.value))),
      'cookie parameter not sent in the cookie header: ' + c.wire)
  }

  // Accept asks only for what a success response declares: its JSON type
  // alone, when it declares one.
  if (null != point.responseMedia) {
    const declared = point.responseMedia
    const asked = String(new Headers(init.headers).get('accept') ?? '').split(',')
      .map(baseMedia).filter((type) => '' !== type)
    assert(0 < asked.length, 'no Accept for a declared response body: ' + declared.join(', '))
    for (const type of asked) {
      assert(declared.some((d) => covers(d, type)),
        'Accept asks for a type no success response declares: ' + type)
    }
    if (declared.some(isJson)) {
      assert(1 === asked.length && isJson(asked[0]),
        'Accept is not the declared JSON type alone: ' + asked.join(', '))
    }
  }

  // A raw body goes out as given, under a type the definition declares.
  if (null != point.rawBody) {
    const type = baseMedia(new Headers(init.headers).get('content-type') ?? '')
    assert(point.rawBody.media.some((d) => covers(d, type)),
      'raw body sent as a type the definition does not declare: ' + type)
    assert.deepEqual(bytesOf(init.body), bytesOf(rawSample(point)), 'raw body not sent as given')
  }

  // An argument the request body declares too goes out in the body as well.
  if (0 < (point.bodyArgs || []).length) {
    let sentBody: any
    try { sentBody = JSON.parse(String(init.body)) }
    catch (_e) { sentBody = undefined }
    for (const name of point.bodyArgs!) {
      assert.deepEqual(sentBody?.[name], input[name], 'argument not sent in the body as well: ' + name)
    }
  }

  if (null != error) {
    throw error
  }

  if (null == point.sample) {
    return
  }

  if ('list' === point.op) {
    const records = recordsOf(point.sample)
    if (null != records) {
      assert(Array.isArray(result), 'list did not return a list')
      assert.equal(result.length, records.length,
        'list read ' + result.length + ' records where the definition example holds ' +
        records.length)
    }
  }
  else if ('load' === point.op || 'create' === point.op || 'update' === point.op ||
    'patch' === point.op) {
    const record = recordOf(point.sample, point.idField, point.entity)
    if (null != record) {
      assert.equal(result?.data?.()?.[point.idField], record[point.idField],
        'the entity does not hold the record the definition example returns')
    }
  }
}


function rawSample(point: DefinitionPoint): any {
  return point.rawBody?.text ? RAW_TEXT : RAW_BYTES
}


function bytesOf(body: any): Buffer {
  return 'string' === typeof body ? Buffer.from(body, 'utf8') :
    body instanceof ArrayBuffer ? Buffer.from(new Uint8Array(body)) :
      ArrayBuffer.isView(body) ? Buffer.from(body.buffer, body.byteOffset, body.byteLength) :
        Buffer.from(String(body))
}


function baseMedia(type: string): string {
  return type.split(';')[0].trim().toLowerCase()
}


function isJson(type: string): boolean {
  const media = baseMedia(type)
  return 'application/json' === media || 'text/json' === media || media.endsWith('+json')
}


function covers(declared: string, type: string): boolean {
  const media = baseMedia(declared)
  return media === type || '*/*' === media ||
    (media.endsWith('/*') && type.startsWith(media.slice(0, -1)))
}


function placed(cred: Credential, headers: Headers, url: URL): boolean {
  if ('query' === cred.in) {
    return KEY === url.searchParams.get(cred.name)
  }

  if ('cookie' === cred.in) {
    return String(headers.get('cookie') || '').split(';')
      .some((part) => cred.name + '=' + KEY === part.trim())
  }

  const value = headers.get(cred.name)
  if (null == value) {
    return false
  }

  const [kind, token] = value.split(' ')

  // The client carries no secret, so the password must be empty.
  if ('basic' === cred.scheme) {
    return 'basic' === String(kind).toLowerCase() &&
      Buffer.from(String(token), 'base64').toString('utf8') === KEY + ':'
  }

  if ('bearer' === cred.scheme) {
    return 'bearer' === String(kind).toLowerCase() && KEY === token
  }

  return value.includes(KEY)
}


// What an envelope may hold beside what it carries, compared without case,
// `_` or `-`: status, paging and the page's own metadata, each by its whole
// name, so a record's homepage or preview is data of its own.
const ENVELOPE_KEYS = new Set([
  'success', 'status', 'ok', 'message', 'code', 'error', 'errorcode', 'errormessage',
  'requestid', 'timestamp', 'took', 'version', 'apiversion', 'object', 'url',
  'count', 'total', 'totalcount', 'totalhits', 'totalitems', 'totalpages', 'totalresults',
  'totalrecords', 'totalrowcount', 'totalentries', 'itemcount', 'resultcount', 'rowcount',
  'page', 'pages', 'pagecount', 'pagenumber', 'pageindex', 'pagesize', 'perpage',
  'currentpage', 'lastpage', 'limit', 'offset', 'cursor', 'nextcursor', 'prevcursor',
  'previouscursor', 'next', 'nextpage', 'nexturl', 'nextlink', 'nextpagetoken', 'nexttoken',
  'pagetoken', 'continuationtoken', 'prev', 'previous', 'prevpage', 'previouspage',
  'prevurl', 'previousurl', 'prevlink', 'hasmore', 'hasnext', 'hasnextpage', 'hasprevious',
  'haspreviouspage', 'more', 'meta', 'metadata', 'pagination', 'paging', 'pageinfo', 'links',
])


function envelopeKey(key: string): boolean {
  return ENVELOPE_KEYS.has(squash(key))
}


function ownData(sample: any): boolean {
  return Object.entries(sample).some(([key, value]) =>
    null != value && 'object' !== typeof value && !envelopeKey(key))
}


function isRecord(value: any): boolean {
  return null != value && 'object' === typeof value && !Array.isArray(value)
}


// The records a list response holds: the body itself, or the one non-empty
// list of objects in a page. Anything else, such as a record that happens to
// hold a list, proves nothing.
function recordsOf(sample: any): any[] | null {
  if (Array.isArray(sample)) {
    return sample
  }
  if (!isRecord(sample) || ownData(sample)) {
    return null
  }
  const lists = Object.values(sample).filter((v: any) => Array.isArray(v) && 0 < v.length &&
    v.every(isRecord))
  return 1 === lists.length ? lists[0] as any[] : null
}


// The record a single-item response returns: the body, or the one object
// with the identity field that an envelope carries, under the entity's name
// or beside envelope keys alone. Otherwise the body is the record itself,
// such as GitHub's check suite preferences beside their repository.
function recordOf(sample: any, idField: string, entity?: string): any {
  if (!isRecord(sample)) {
    return null
  }
  if (null != sample[idField]) {
    return sample
  }
  const keys = Object.keys(sample)
  const inner = keys.filter((key) => isRecord(sample[key]) && null != sample[key][idField])
  if (1 !== inner.length) {
    return null
  }
  const named = null != entity && squash(inner[0]) === squash(entity) && !ownData(sample)
  const alone = keys.every((key) => key === inner[0] || envelopeKey(key))
  return named || alone ? sample[inner[0]] : null
}


function squash(name: string): string {
  return name.toLowerCase().replace(/[_-]/g, '')
}


export { runDefinitionPoint, recordsOf, recordOf }
export type { DefinitionPoint }
