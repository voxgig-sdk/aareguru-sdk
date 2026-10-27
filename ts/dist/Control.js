"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Control = void 0;
const StructUtility_1 = require("./utility/StructUtility");
class Control {
    throw;
    err;
    explain;
    // Cancels the request in flight, which ts and js alone do so far.
    signal;
    constructor(ctrlmap) {
        this.throw = (0, StructUtility_1.getprop)(ctrlmap, 'throw');
        this.err = (0, StructUtility_1.getprop)(ctrlmap, 'err');
        this.explain = (0, StructUtility_1.getprop)(ctrlmap, 'explain');
        this.signal = (0, StructUtility_1.getprop)(ctrlmap, 'signal');
    }
}
exports.Control = Control;
//# sourceMappingURL=Control.js.map