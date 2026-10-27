"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allowed = allowed;
exports.prepareMethod = prepareMethod;
function prepareMethod(ctx) {
    const op = ctx.op;
    const opname = op.name;
    let key = opname;
    const methodMap = {
        create: 'POST',
        update: 'PUT',
        load: 'GET',
        list: 'GET',
        remove: 'DELETE',
        patch: 'PATCH',
    };
    // The API definition is authoritative: a POST-only or PATCH-based API
    // exposes `update` as POST or PATCH, not the PUT the op name implies.
    // Only fall back to the op-name convention when the point has no method.
    const method = ctx.point?.method;
    if (null != method && '' !== method) {
        return method.toUpperCase();
    }
    return methodMap[key];
}
// Whether a comma-separated allow option names the item: whole names, any case.
function allowed(list, item) {
    const want = 'string' === typeof item ? item.toUpperCase() : '';
    return '' !== want && 'string' === typeof list &&
        list.split(',').some((name) => name.trim().toUpperCase() === want);
}
//# sourceMappingURL=PrepareMethodUtility.js.map