"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AareguruError = void 0;
class AareguruError extends Error {
    isAareguruError = true;
    sdk = 'Aareguru';
    code;
    ctx;
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