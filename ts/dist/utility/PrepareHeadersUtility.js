"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareHeaders = prepareHeaders;
function prepareHeaders(ctx) {
    const struct = ctx.utility.struct;
    const clone = struct.clone;
    const getprop = struct.getprop;
    const stringify = struct.stringify;
    const client = ctx.client;
    const options = client.options();
    let out = clone(getprop(options, 'headers', {}));
    // A header parameter travels as a header, under the name the definition
    // gives it, and only from this call's own arguments. It replaces a default
    // of the same name, whatever its case.
    for (const h of (ctx.point?.args?.header || [])) {
        if ('string' !== typeof h?.name || '' === h.name)
            continue;
        const val = getprop(ctx.reqmatch, h.name) ?? getprop(ctx.reqdata, h.name);
        if (null != val) {
            const wire = String(h.orig || h.name).toLowerCase();
            for (const key of Object.keys(out)) {
                if (wire === key.toLowerCase())
                    delete out[key];
            }
            out[wire] = stringify(val);
        }
    }
    return out;
}
//# sourceMappingURL=PrepareHeadersUtility.js.map