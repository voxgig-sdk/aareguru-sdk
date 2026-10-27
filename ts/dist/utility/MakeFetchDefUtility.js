"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeFetchDef = makeFetchDef;
const types_1 = require("../types");
const MediaUtility_1 = require("./MediaUtility");
function makeFetchDef(ctx) {
    const spec = ctx.spec;
    const utility = ctx.utility;
    const makeUrl = utility.makeUrl;
    const struct = utility.struct;
    const jsonify = struct.jsonify;
    if (null == spec) {
        return ctx.error('fetchdef_no_spec', 'Expected context spec property to be defined.');
    }
    if (null == ctx.result) {
        ctx.result = new types_1.Result({});
    }
    spec.step = 'prepare';
    const url = makeUrl(ctx);
    if (url instanceof Error) {
        return url;
    }
    spec.url = url;
    const fetchdef = {
        url,
        method: spec.method,
        headers: spec.headers,
    };
    if (null != ctx.ctrl?.signal) {
        fetchdef.signal = ctx.ctrl.signal;
    }
    if (null != spec.body) {
        const body = spec.body;
        // A JSON point's body is JSON whatever its value; a scalar elsewhere goes as given.
        fetchdef.body = (0, MediaUtility_1.isRawValue)(body) || ('object' !== typeof body && !(0, MediaUtility_1.isJsonRequest)(ctx.point)) ?
            body : jsonify(body);
        // Node's fetch refuses a stream body without it.
        if ((0, MediaUtility_1.isStream)(body)) {
            fetchdef.duplex = 'half';
        }
    }
    return fetchdef;
}
//# sourceMappingURL=MakeFetchDefUtility.js.map