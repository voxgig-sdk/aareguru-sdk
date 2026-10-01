"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeError = makeError;
const types_1 = require("../types");
const CleanUtility_1 = require("./CleanUtility");
const StructUtility_1 = require("./StructUtility");
function makeError(ctx, err) {
    ctx = ctx || {};
    const op = ctx.op || {};
    op.name = op.name || 'unknown operation';
    const result = ctx.result || new types_1.Result({});
    result.ok = false;
    const reserr = result.err;
    err = undefined === err ? reserr : err;
    err = err || ctx.error('unknown', 'unknown error');
    // A hook or fetcher may reject with a plain value; clean returns a masked
    // copy of that rather than changing it, so the copy is what leaves.
    if (!(err instanceof Error)) {
        const copy = (0, CleanUtility_1.clean)(ctx, err);
        const text = 'string' === typeof copy ? copy : String(copy?.message ?? 'unknown error');
        err = Object.assign(new Error(text), 'object' === typeof copy ? copy : {});
    }
    const errmsg = err.message || 'unknown error';
    err.message = 'AareguruSDK: ' + op.name + ': ' + errmsg;
    // Reachable for a debugger, invisible to a serialiser.
    if (null != err.ctx) {
        Object.defineProperty(err, 'ctx', { value: err.ctx, enumerable: false, writable: true });
    }
    (0, CleanUtility_1.clean)(ctx, err);
    if (result.err) {
        (0, StructUtility_1.delprop)(result, 'err');
    }
    const spec = ctx.spec || {};
    if (ctx.ctrl.explain) {
        ctx.ctrl.explain.err = {
            ...(0, StructUtility_1.clone)({ err }).err,
            message: err.message,
            stack: err.stack,
        };
    }
    err.result = (0, CleanUtility_1.clean)(ctx, result);
    err.spec = (0, CleanUtility_1.clean)(ctx, spec);
    // So a consumer branches on `err.status`, not on the shape of `err.result`.
    err.status = null == result.status ? -1 : result.status;
    ctx.ctrl.err = err;
    // Closes error paths that never reach PreDone (e.g. an rbac short-circuit).
    if (null != ctx.client && null != ctx.utility &&
        'function' === typeof ctx.utility.featureHook) {
        ctx.utility.featureHook(ctx, 'PreUnexpected');
    }
    if (false === ctx.ctrl.throw) {
        return result.resdata;
    }
    else {
        throw err;
    }
}
//# sourceMappingURL=MakeErrorUtility.js.map