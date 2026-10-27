"use strict";
// The media types a point declares: `response` (the model's `rs`) for the
// Accept header, and `body` (the model's `rb`) for the request body.
Object.defineProperty(exports, "__esModule", { value: true });
exports.RAW_BODY = void 0;
exports.acceptOf = acceptOf;
exports.isJsonMedia = isJsonMedia;
exports.isJsonRequest = isJsonRequest;
exports.isRawRequest = isRawRequest;
exports.isRawValue = isRawValue;
exports.isStream = isStream;
exports.mediaHeaders = mediaHeaders;
exports.rawBody = rawBody;
exports.readStream = readStream;
// The data key of a raw request body; like `$action`, never an argument name.
const RAW_BODY = '$body';
exports.RAW_BODY = RAW_BODY;
function isJsonMedia(type) {
    const media = String(null == type ? '' : type).split(';')[0].trim().toLowerCase();
    return 'application/json' === media || 'text/json' === media || media.endsWith('+json');
}
// The declared JSON type alone, else every declared type in model order; nothing without a body.
function acceptOf(point) {
    const res = point?.response;
    if (null == res || 'string' !== typeof res.media || '' === res.media) {
        return undefined;
    }
    if ('json' === res.kind) {
        return res.media;
    }
    const alts = Array.isArray(res.alternatives) ? res.alternatives : [];
    return [res.media, ...alts.map((alt) => alt?.media)]
        .filter((media) => 'string' === typeof media && '' !== media)
        .join(', ');
}
function isRawRequest(point) {
    return 'raw' === point?.body?.kind;
}
function isJsonRequest(point) {
    return 'json' === point?.body?.kind;
}
function hasHeader(headers, name) {
    return Object.keys(headers).some((key) => name === key.toLowerCase());
}
// A caller's accept wins. A declared request type replaces each JSON
// content-type, the SDK default, and leaves any other the caller set.
function mediaHeaders(point, headers) {
    const accept = acceptOf(point);
    if (null != accept && !hasHeader(headers, 'accept')) {
        headers.accept = accept;
    }
    const body = point?.body;
    if (('raw' === body?.kind || 'json' === body?.kind) &&
        'string' === typeof body.media && '' !== body.media) {
        for (const key of Object.keys(headers)) {
            if ('content-type' === key.toLowerCase() && isJsonMedia(headers[key])) {
                delete headers[key];
            }
        }
        if (!hasHeader(headers, 'content-type')) {
            headers['content-type'] = body.media;
        }
    }
    return headers;
}
function rawBody(reqdata) {
    return null != reqdata && 'object' === typeof reqdata ? reqdata[RAW_BODY] : undefined;
}
function isStream(value) {
    return null != value && 'object' === typeof value &&
        (('undefined' !== typeof ReadableStream && value instanceof ReadableStream) ||
            'function' === typeof value[Symbol.asyncIterator]);
}
// A stream can be read once. makeRequest reads it before the first attempt,
// so that a retry sends the same bytes again.
async function readStream(stream) {
    const chunks = [];
    if ('undefined' !== typeof ReadableStream && stream instanceof ReadableStream) {
        const reader = stream.getReader();
        for (;;) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            chunks.push(chunkBytes(value));
        }
    }
    else {
        for await (const chunk of stream) {
            chunks.push(chunkBytes(chunk));
        }
    }
    const out = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0));
    let at = 0;
    for (const chunk of chunks) {
        out.set(chunk, at);
        at += chunk.byteLength;
    }
    return out;
}
function chunkBytes(chunk) {
    if ('string' === typeof chunk) {
        return new TextEncoder().encode(chunk);
    }
    if (chunk instanceof ArrayBuffer) {
        return new Uint8Array(chunk);
    }
    return new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
}
// Bytes, a Blob or a stream: fetch sends these as they are.
function isRawValue(value) {
    return value instanceof ArrayBuffer || ArrayBuffer.isView(value) ||
        ('undefined' !== typeof Blob && value instanceof Blob) || isStream(value);
}
//# sourceMappingURL=MediaUtility.js.map