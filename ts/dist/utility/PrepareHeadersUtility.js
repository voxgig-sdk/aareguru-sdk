"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareHeaders = prepareHeaders;
exports.cookieKeep = cookieKeep;
const ParamUtility_1 = require("./ParamUtility");
const MediaUtility_1 = require("./MediaUtility");
function prepareHeaders(ctx) {
    const struct = ctx.utility.struct;
    const clone = struct.clone;
    const getprop = struct.getprop;
    const stringify = struct.stringify;
    const client = ctx.client;
    const options = client.options();
    let out = (0, MediaUtility_1.mediaHeaders)(ctx.point, clone(getprop(options, 'headers', {})));
    // A header argument replaces a default of the same name, whatever its case.
    for (const arg of (0, ParamUtility_1.callArgs)(ctx, 'header')) {
        if (null != arg.val) {
            const wire = arg.wire.toLowerCase();
            for (const key of Object.keys(out)) {
                if (wire === key.toLowerCase())
                    delete out[key];
            }
            out[wire] = stringify(arg.val);
        }
    }
    // A cookie argument travels in the cookie header, form serialized and
    // percent-encoded, replacing a same-named cookie the caller's headers send.
    const sent = (0, ParamUtility_1.callArgs)(ctx, 'cookie').filter((arg) => null != arg.val);
    if (0 < sent.length) {
        const names = sent.flatMap((arg) => struct.ismap(arg.val) ?
            struct.keysof(arg.val).map((key) => struct.escurl(key)) : [arg.wire]);
        const kept = [];
        for (const key of Object.keys(out)) {
            if ('cookie' !== key.toLowerCase())
                continue;
            if ('string' === typeof out[key])
                kept.push(...cookieKeep(out[key], names));
            delete out[key];
        }
        for (const arg of sent) {
            const pair = cookiePair(struct, arg.wire, arg.val);
            if ('' !== pair)
                kept.push(pair);
        }
        if (0 < kept.length)
            out['cookie'] = kept.join('; ');
    }
    return out;
}
// The form style of a cookie parameter: a list repeats the name, a map sends
// its own keys, and every value is percent-encoded.
function cookiePair(struct, wire, val) {
    const esc = (v) => struct.escurl(struct.stringify(v));
    const pairs = struct.islist(val) ? val.map((item) => wire + '=' + esc(item)) :
        struct.ismap(val) ? struct.keysof(val).map((key) => struct.escurl(key) + '=' + esc(val[key])) :
            [wire + '=' + esc(val)];
    return pairs.join('; ');
}
// The caller's cookie pieces with the named cookies removed: a cookie is one
// `;`-delimited piece, whatever its value holds.
function cookieKeep(header, names) {
    const kept = [];
    for (const piece of header.split(';')) {
        const cookie = piece.trim();
        if ('' !== cookie && !names.includes(cookie.split('=')[0].trim()))
            kept.push(cookie);
    }
    return kept;
}
//# sourceMappingURL=PrepareHeadersUtility.js.map