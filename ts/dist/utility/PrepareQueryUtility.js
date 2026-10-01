"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareQuery = prepareQuery;
function prepareQuery(ctx) {
    const utility = ctx.utility;
    const struct = utility.struct;
    const items = struct.items;
    const point = ctx.point;
    let params = point.params;
    let reqmatch = ctx.reqmatch;
    params = params || [];
    reqmatch = reqmatch || {};
    // A path parameter travels in the path. The generated config lists them as
    // args.params, which prepareParams reads; params is the older list of names.
    // A header parameter travels in the headers, which prepareHeaders fills.
    const inpath = params.concat((point.args?.params || []).map((p) => p?.name), (point.args?.header || []).map((h) => h?.name));
    // A query parameter travels under the name the definition gives it, its
    // orig, which the model may have renamed for the caller.
    const wire = Object.create(null);
    for (const q of (point.args?.query || [])) {
        if ('string' === typeof q?.name && 'string' === typeof q?.orig && '' !== q.orig) {
            wire[q.name] = q.orig;
        }
    }
    const out = {};
    for (let [key, val] of items(reqmatch)) {
        if (null != val && '$action' !== key && !inpath.includes(key)) {
            out[wire[key] ?? key] = val;
        }
    }
    return out;
}
//# sourceMappingURL=PrepareQueryUtility.js.map