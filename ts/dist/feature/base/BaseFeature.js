"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseFeature = void 0;
class BaseFeature {
    version = '0.0.1';
    name = 'base';
    active = true;
    init(_ctx, _options) { }
    PostConstruct(_ctx) { }
    PostConstructEntity(_ctx) { }
    SetData(_ctx) { }
    GetData(_ctx) { }
    SetMatch(_ctx) { }
    GetMatch(_ctx) { }
    PrePoint(_ctx) { }
    PreSpec(_ctx) { }
    PreRequest(_ctx) { }
    PreResponse(_ctx) { }
    PreResult(_ctx) { }
    PreDone(_ctx) { }
    PreUnexpected(_ctx) { }
    // Settles as `wait` does unless the signal aborts first, which runs `stop`
    // and rejects with the signal's reason.
    _untilAbort(wait, signal, stop) {
        if (null == signal) {
            return wait;
        }
        return new Promise((resolve, reject) => {
            const abort = () => {
                if (null != stop) {
                    stop();
                }
                reject(signal.reason);
            };
            if (signal.aborted) {
                return abort();
            }
            signal.addEventListener('abort', abort, { once: true });
            wait.then((value) => {
                signal.removeEventListener('abort', abort);
                resolve(value);
            }, (err) => {
                signal.removeEventListener('abort', abort);
                reject(err);
            });
        });
    }
}
exports.BaseFeature = BaseFeature;
//# sourceMappingURL=BaseFeature.js.map