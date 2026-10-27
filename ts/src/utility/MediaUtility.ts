
// The media types a point declares: `response` (the model's `rs`) for the
// Accept header, and `body` (the model's `rb`) for the request body.


// The data key of a raw request body; like `$action`, never an argument name.
const RAW_BODY = '$body'


function isJsonMedia(type: any): boolean {
  const media = String(null == type ? '' : type).split(';')[0].trim().toLowerCase()
  return 'application/json' === media || 'text/json' === media || media.endsWith('+json')
}


// The declared JSON type alone, else every declared type in model order; nothing without a body.
function acceptOf(point: any): string | undefined {
  const res = point?.response
  if (null == res || 'string' !== typeof res.media || '' === res.media) {
    return undefined
  }
  if ('json' === res.kind) {
    return res.media
  }
  const alts = Array.isArray(res.alternatives) ? res.alternatives : []
  return [res.media, ...alts.map((alt: any) => alt?.media)]
    .filter((media: any) => 'string' === typeof media && '' !== media)
    .join(', ')
}


function isRawRequest(point: any): boolean {
  return 'raw' === point?.body?.kind
}


function isJsonRequest(point: any): boolean {
  return 'json' === point?.body?.kind
}


function hasHeader(headers: Record<string, any>, name: string): boolean {
  return Object.keys(headers).some((key) => name === key.toLowerCase())
}


// A caller's accept wins. A declared request type replaces each JSON
// content-type, the SDK default, and leaves any other the caller set.
function mediaHeaders(point: any, headers: Record<string, any>): Record<string, any> {
  const accept = acceptOf(point)
  if (null != accept && !hasHeader(headers, 'accept')) {
    headers.accept = accept
  }

  const body = point?.body
  if (('raw' === body?.kind || 'json' === body?.kind) &&
    'string' === typeof body.media && '' !== body.media) {
    for (const key of Object.keys(headers)) {
      if ('content-type' === key.toLowerCase() && isJsonMedia(headers[key])) {
        delete headers[key]
      }
    }
    if (!hasHeader(headers, 'content-type')) {
      headers['content-type'] = body.media
    }
  }

  return headers
}


function rawBody(reqdata: any): any {
  return null != reqdata && 'object' === typeof reqdata ? reqdata[RAW_BODY] : undefined
}


function isStream(value: any): boolean {
  return null != value && 'object' === typeof value &&
    (('undefined' !== typeof ReadableStream && value instanceof ReadableStream) ||
      'function' === typeof value[Symbol.asyncIterator])
}


// A stream can be read once. makeRequest reads it before the first attempt,
// so that a retry sends the same bytes again.
async function readStream(stream: any): Promise<Uint8Array> {
  const chunks: Uint8Array[] = []
  if ('undefined' !== typeof ReadableStream && stream instanceof ReadableStream) {
    const reader = stream.getReader()
    for (; ;) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      chunks.push(chunkBytes(value))
    }
  }
  else {
    for await (const chunk of stream) {
      chunks.push(chunkBytes(chunk))
    }
  }

  const out = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0))
  let at = 0
  for (const chunk of chunks) {
    out.set(chunk, at)
    at += chunk.byteLength
  }
  return out
}


function chunkBytes(chunk: any): Uint8Array {
  if ('string' === typeof chunk) {
    return new TextEncoder().encode(chunk)
  }
  if (chunk instanceof ArrayBuffer) {
    return new Uint8Array(chunk)
  }
  return new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength)
}


// Bytes, a Blob or a stream: fetch sends these as they are.
function isRawValue(value: any): boolean {
  return value instanceof ArrayBuffer || ArrayBuffer.isView(value) ||
    ('undefined' !== typeof Blob && value instanceof Blob) || isStream(value)
}


export {
  RAW_BODY,
  acceptOf,
  isJsonMedia,
  isJsonRequest,
  isRawRequest,
  isRawValue,
  isStream,
  mediaHeaders,
  rawBody,
  readStream,
}
