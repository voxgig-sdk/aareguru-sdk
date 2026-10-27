"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformRequest = transformRequest;
const ParamUtility_1 = require("./ParamUtility");
function transformRequest(ctx) {
    const spec = ctx.spec;
    const utility = ctx.utility;
    const point = ctx.point;
    const isfunc = utility.struct.isfunc;
    const transform = utility.struct.transform;
    if (spec) {
        spec.step = 'reqform';
    }
    try {
        const reqform = point.transform.req;
        const reqdata = isfunc(reqform) ? reqform(ctx) : transform({
            reqdata: omit(ctx.reqdata, routedArgNames(ctx))
        }, reqform);
        return stripAction(reqdata);
    }
    catch (err) {
        return utility.makeError(ctx, err);
    }
}
function stripAction(reqdata) {
    return omit(reqdata, ['$action']);
}
// A header, cookie or query argument travels where prepareHeaders or
// prepareQuery sends it, so the body is built from the request data without
// it, unless the point marks it as a field the body keeps.
function routedArgNames(ctx) {
    return [...(0, ParamUtility_1.callArgs)(ctx, 'header'), ...(0, ParamUtility_1.callArgs)(ctx, 'cookie'), ...(0, ParamUtility_1.callArgs)(ctx, 'query')]
        .map((arg) => arg.name)
        .filter((name) => !fieldArg(ctx, name));
}
function fieldArg(ctx, name) {
    return ['header', 'cookie', 'query'].some((kind) => (ctx.point?.args?.[kind] || []).some((arg) => name === arg?.name && true === arg?.field));
}
function omit(reqdata, names) {
    if (null == reqdata || 'object' !== typeof reqdata || Array.isArray(reqdata)) {
        return reqdata;
    }
    if (!names.some((name) => Object.prototype.hasOwnProperty.call(reqdata, name))) {
        return reqdata;
    }
    const body = {};
    for (const key of Object.keys(reqdata)) {
        if (names.includes(key)) {
            continue;
        }
        if ('__proto__' === key) {
            Object.defineProperty(body, key, {
                value: reqdata[key],
                enumerable: true,
                writable: true,
                configurable: true,
            });
        }
        else {
            body[key] = reqdata[key];
        }
    }
    return body;
}
//# sourceMappingURL=TransformRequestUtility.js.map