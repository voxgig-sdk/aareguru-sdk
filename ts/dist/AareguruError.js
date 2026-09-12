"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AareguruError = void 0;
class AareguruError extends Error {
    isAareguruError = true;
    sdk = 'Aareguru';
    code;
    ctx;
    // HTTP status of the response that caused this error, or -1 when the
    // request never got one (transport failure, client-side abort).
    //
    // PROMOTED to the top level on purpose. It used to be reachable only at
    // `err.result.status` — two levels into an object that reads as internal —
    // so every consumer of every generated SDK wrote the same
    // `404 === e?.result?.status` branch and coupled itself to the internal
    // shape of `result`. Mapping "not found" to a null result is table stakes
    // for a client integration.
    status = -1;
    // `err.notFound` rather than a magic number at every call site.
    get notFound() { return 404 === this.status; }
    constructor(code, msg, ctx) {
        super(msg);
        this.code = code;
        this.ctx = ctx;
    }
}
exports.AareguruError = AareguruError;
//# sourceMappingURL=AareguruError.js.map