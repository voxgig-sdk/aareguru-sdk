"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Response = void 0;
const StructUtility_1 = require("./utility/StructUtility");
class Response {
    status;
    statusText;
    headers;
    json;
    err;
    body;
    constructor(resmap) {
        this.status = (0, StructUtility_1.getprop)(resmap, 'status', -1);
        this.statusText = (0, StructUtility_1.getprop)(resmap, 'statusText', '');
        this.headers = (0, StructUtility_1.getprop)(resmap, 'headers');
        this.json = readJson(resmap);
        this.body = (0, StructUtility_1.getprop)(resmap, 'body');
        this.err = (0, StructUtility_1.getprop)(resmap, 'err');
    }
}
exports.Response = Response;
// An empty body, such as the one an accepted delete answers with, is no
// body: parsing it as JSON would throw after the call has succeeded.
function readJson(resmap) {
    if ('function' === typeof resmap.text) {
        return async () => {
            const text = await resmap.text();
            return '' === text.trim() ? undefined : JSON.parse(text);
        };
    }
    return resmap.json ? resmap.json.bind(resmap) : async () => undefined;
}
//# sourceMappingURL=Response.js.map