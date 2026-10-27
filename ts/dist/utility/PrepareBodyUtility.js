"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareBody = prepareBody;
const MediaUtility_1 = require("./MediaUtility");
function prepareBody(ctx) {
    const op = ctx.op;
    const utility = ctx.utility;
    const error = utility.makeError;
    const transformRequest = utility.transformRequest;
    let body = undefined;
    if ('data' === op.input) {
        if ((0, MediaUtility_1.isRawRequest)(ctx.point)) {
            return (0, MediaUtility_1.rawBody)(ctx.reqdata);
        }
        try {
            body = transformRequest(ctx);
        }
        catch (err) {
            return error(ctx, err);
        }
    }
    return body;
}
//# sourceMappingURL=PrepareBodyUtility.js.map