"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const node_util_1 = require("node:util");
const __1 = require("..");
const harness_1 = require("./feature/harness");
// Generated: the credential's wire placement is fixed when the SDK is built.
const AUTH = { "suppressed": false, "where": "header", "name": "authorization", "basic": false };
const CANARY = {
    apikey: 'CANARY-APIKEY-k9x2m7q4p1',
    secret: 'CANARY-SECRET-w3e8r5t2y6',
    header: 'CANARY-HEADER-z1x4c7v0b3',
    value: 'CANARY-VALUE-n5m8b2v9c4',
    config: 'CANARY-CONFIG-h6j3k8l2m5',
};
const MASK = '[redacted]';
// Every form a canary can travel in.
const FORMS = [];
for (const v of Object.values(CANARY)) {
    FORMS.push(v, Buffer.from(v).toString('base64'), encodeURIComponent(v));
}
FORMS.push(Buffer.from(CANARY.apikey + ':' + CANARY.secret).toString('base64'));
// Header maps keep the caller's spelling; the assertion should not care.
function header(map, name) {
    for (const k of Object.keys(map || {})) {
        if (k.toLowerCase() === name.toLowerCase())
            return map[k];
    }
    return undefined;
}
function leaks(text) {
    return FORMS.filter((f) => text.includes(f));
}
function forms(name, val) {
    const out = [];
    const push = (kind, fn) => {
        try {
            out.push({ name: name + ':' + kind, text: fn() });
        }
        catch (_e) { }
    };
    push('json', () => JSON.stringify(val));
    push('string', () => String(val));
    push('inspect', () => (0, node_util_1.inspect)(val, { depth: 8 }));
    if (val instanceof Error) {
        push('message', () => String(val.message));
        push('stack', () => String(val.stack));
        push('props', () => (0, node_util_1.inspect)({ ...val }, { depth: 8 }));
    }
    return out;
}
// Captures the serialised context from inside the pipeline: what a hook
// author would hand to a logger.
class CaptureFeature extends __1.BaseFeature {
    name = 'capture';
    version = '0.0.1';
    active = true;
    _sinks;
    constructor(sinks) { super(); this._sinks = sinks; }
    init() { }
    PreRequest(ctx) { this._sinks.push(...forms('ctx@PreRequest', ctx)); }
    PreResponse(ctx) { this._sinks.push(...forms('ctx@PreResponse', ctx)); }
    // The SDK's own error as a hook reads it, which an observability feature logs.
    PreUnexpected(ctx) {
        this._sinks.push(...forms('ctx@PreUnexpected', ctx));
        if (ctx.ctrl?.err instanceof Error)
            this._sinks.push(...forms('ctrl.err@PreUnexpected', ctx.ctrl.err));
    }
}
function response(status, data, headers) {
    const h = { 'content-type': 'application/json', ...(headers || {}) };
    return {
        status,
        statusText: status < 400 ? 'OK' : 'ERR',
        json: async () => data,
        text: async () => JSON.stringify(data),
        headers: {
            get(key) { return h[String(key).toLowerCase()]; },
            forEach(cb) { Object.keys(h).forEach((k) => cb(h[k], k, this)); },
        },
    };
}
const SCENARIOS = [
    { name: 'ok', respond: () => response(200, { id: 'i1', name: 'n1' }, { 'x-session-token': 'RESP-TOKEN-a1b2c3d4e5' }) },
    { name: 'notfound', respond: () => response(404, { error: 'no such record' }) },
    { name: 'server', respond: () => response(500, { error: 'boom' }) },
    { name: 'transport', respond: (url) => {
            throw new Error('socket hang up (URL was: "' + url + '")');
        } },
    { name: 'notjson', respond: () => ({
            status: 200, statusText: 'OK',
            json: async () => { throw new Error('Unexpected token < in JSON'); },
            text: async () => '<html>',
            headers: { get() { return undefined; }, forEach() { } },
        }) },
    // The SDK's own error, its code quoting a registered value.
    { name: 'coded', respond: (_url, _fetchdef, ctx) => {
            throw ctx.error('denied_' + CANARY.apikey, 'coded failure');
        } },
];
function makeSdk(scenario, sinks, cleanopts, extra) {
    const capture = (name) => (rec) => { sinks.push(...forms(name, rec)); };
    const feature = {};
    if ((0, harness_1.hasFeature)('log')) {
        const logger = {};
        for (const level of ['trace', 'debug', 'info', 'warn', 'error', 'fatal']) {
            logger[level] = capture('log.' + level);
        }
        feature.log = { active: true, logger };
    }
    if ((0, harness_1.hasFeature)('debug'))
        feature.debug = { active: true, onEntry: capture('debug') };
    if ((0, harness_1.hasFeature)('audit'))
        feature.audit = { active: true, sink: capture('audit') };
    if ((0, harness_1.hasFeature)('telemetry'))
        feature.telemetry = { active: true, exporter: capture('telemetry') };
    if ((0, harness_1.hasFeature)('cost'))
        feature.cost = { active: true, sink: capture('cost') };
    if ((0, harness_1.hasFeature)('metrics'))
        feature.metrics = { active: true };
    if ((0, harness_1.hasFeature)('clienttrack'))
        feature.clienttrack = { active: true };
    const opts = {
        apikey: CANARY.apikey,
        secret: CANARY.secret,
        headers: { 'X-Custom-Token': CANARY.header },
        feature,
        extend: [new CaptureFeature(sinks), ...(extra || [])],
        utility: {
            fetcher: async (ctx, url, fetchdef) => scenario.respond(url, fetchdef, ctx),
        },
    };
    // null builds the client with no clean block at all, as most callers do.
    if (null !== cleanopts)
        opts.clean = { values: CANARY.value, ...(cleanopts || {}) };
    return new __1.SDK(opts);
}
async function usableOp() {
    const plain = new __1.SDK({
        apikey: CANARY.apikey,
        utility: { fetcher: async () => response(200, { id: 'i1' }) },
    });
    const entities = plain._rootctx.config.entity || {};
    const rank = (op) => ({ list: 0, load: 1 }[op] ?? 2);
    for (const m of Object.getOwnPropertyNames(Object.getPrototypeOf(plain)).sort()) {
        if (!/^[A-Z]/.test(m) || 'function' !== typeof plain[m]) {
            continue;
        }
        let inst;
        try {
            inst = plain[m]();
        }
        catch (_e) {
            continue;
        }
        if (null == inst || 'string' !== typeof inst.name || null == entities[inst.name]) {
            continue;
        }
        const opdefs = entities[inst.name].op || {};
        for (const op of Object.keys(opdefs).sort((a, b) => rank(a) - rank(b))) {
            const filled = {};
            for (const point of opdefs[op].points || []) {
                for (const p of point?.args?.params || []) {
                    if ('string' === typeof p?.name)
                        filled[p.name] = 'p1';
                }
            }
            for (const match of [{}, filled]) {
                try {
                    await plain[m]()[op]({ ...match }, {});
                    return { accessor: m, op, match };
                }
                catch (_e) {
                    continue;
                }
            }
        }
    }
    return null;
}
// A feature that throws from inside the pipeline, quoting the request it
// saw: an error makeError never handled.
class ThrowFeature extends __1.BaseFeature {
    name = 'throwhook';
    version = '0.0.1';
    active = true;
    _unexpected;
    constructor(unexpected = false) { super(); this._unexpected = unexpected; }
    init() { }
    PreResponse(ctx) {
        throw new Error('hook saw ' + JSON.stringify(ctx.spec));
    }
    // Fired from the operation's catch block, before its cleaning.
    PreUnexpected(ctx) {
        if (this._unexpected)
            throw new Error('hook saw ' + JSON.stringify(ctx.spec));
    }
}
// A stream that fails while the caller iterates it, quoting a credential.
class StreamThrowFeature extends __1.BaseFeature {
    name = 'streamthrow';
    version = '0.0.1';
    active = true;
    init() { }
    PreDone(ctx) {
        ctx.result.stream = async function* () { throw new Error('stream saw ' + CANARY.apikey); };
    }
}
// A stream that succeeds, so the pipeline's terminal step never runs.
class StreamOkFeature extends __1.BaseFeature {
    name = 'streamok';
    version = '0.0.1';
    active = true;
    init() { }
    PreDone(ctx) {
        const items = [].concat(ctx.result.resdata ?? []);
        ctx.result.stream = async function* () { yield* items; };
    }
}
async function drive(sdk, target, ctrl, sinks) {
    // A caller may keep the record it passed rather than read ctrl.explain.
    const held = ctrl.explain;
    let out = undefined;
    let err = undefined;
    try {
        out = await sdk[target.accessor]()[target.op]({ ...target.match }, ctrl);
    }
    catch (e) {
        err = e;
    }
    if (undefined !== err)
        sinks.push(...forms('error', err));
    if (undefined !== out)
        sinks.push(...forms('result', out));
    if (null != ctrl.explain)
        sinks.push(...forms('explain', ctrl.explain));
    if (null != held && held !== ctrl.explain)
        sinks.push(...forms('explain:held', held));
    return err;
}
(0, node_test_1.describe)('clean', () => {
    (0, node_test_1.test)('no credential leaves the SDK in any form', async (t) => {
        const target = await usableOp();
        if (null == target) {
            return t.skip('no operation of this SDK completes against a plain 200; nothing to sweep');
        }
        const sinks = [];
        const errors = {};
        const explains = {};
        for (const scenario of SCENARIOS) {
            for (const variant of [
                { name: 'throw', ctrl: () => ({}) },
                { name: 'explain', ctrl: () => ({ explain: {} }) },
                { name: 'nothrow', ctrl: () => ({ throw: false, explain: {} }) },
            ]) {
                const sdk = makeSdk(scenario, sinks);
                const ctrl = variant.ctrl();
                const err = await drive(sdk, target, ctrl, sinks);
                const key = scenario.name + '/' + variant.name;
                if (null != err)
                    errors[key] = err;
                if (null != ctrl.explain)
                    explains[key] = ctrl.explain;
                sinks.push(...forms('sdk', sdk));
                sinks.push({ name: 'sdk:spread', text: (0, node_util_1.inspect)({ ...sdk }, { depth: 6 }) });
            }
        }
        // A credential mistyped as an object is rejected by validation, whose
        // message quotes the value it rejected; with and without a clean block.
        for (const cleanblock of [{ clean: { values: CANARY.value } }, {}]) {
            let rejected = undefined;
            try {
                new __1.SDK({ apikey: { value: CANARY.apikey }, ...cleanblock });
            }
            catch (e) {
                rejected = e;
            }
            (0, node_assert_1.ok)(null != rejected, 'a credential mistyped as an object should be rejected');
            sinks.push(...forms('rejected', rejected));
        }
        // An error a feature hook throws, quoting the request, skips makeError.
        for (const unexpected of [false, true]) {
            const hooked = makeSdk(SCENARIOS[0], sinks, undefined, [new ThrowFeature(unexpected)]);
            const hookerr = await drive(hooked, target, { explain: {} }, sinks);
            (0, node_assert_1.ok)(null != hookerr, 'the throwing hook should fail the operation');
        }
        // Iterating a stream runs inside the same catch path as the operation,
        // and the explain record the caller passed is cleaned however it ends.
        for (const [name, extra] of [['stream', [new StreamThrowFeature()]],
            ['stream-ok', [new StreamOkFeature()]], ['stream-plain', []]]) {
            const streamed = makeSdk(SCENARIOS[0], sinks, undefined, extra);
            const explain = {};
            let streamerr = undefined;
            try {
                for await (const _item of streamed[target.accessor]().stream(target.op, { reqmatch: { ...target.match } }, { ctrl: { explain } })) { }
            }
            catch (e) {
                streamerr = e;
            }
            (0, node_assert_1.ok)(('stream' === name) === (null != streamerr), name + ': only the failing stream throws');
            if (null != streamerr)
                sinks.push(...forms(name, streamerr));
            (0, node_assert_1.ok)(0 < Object.keys(explain).length, name + ': the explain record was not filled');
            sinks.push(...forms(name + ':explain', explain));
        }
        // Most callers pass no clean block; the defaults alone must mask.
        for (const scenario of [SCENARIOS[1], SCENARIOS[3]]) {
            const bare = makeSdk(scenario, sinks, null);
            await drive(bare, target, { explain: {} }, sinks);
            sinks.push(...forms('bare', bare));
        }
        // The generated config's own clean block is read beside the caller's,
        // and is not changed by it.
        const util = makeSdk(SCENARIOS[0], sinks).utility();
        const cfgclean = { keys: 'zzsens', values: CANARY.config };
        const built = util.makeOptions({ utility: util, config: { options: { clean: cfgclean } },
            options: { clean: { values: CANARY.value } } });
        const seeded = util.clean({ options: built }, 'config ' + CANARY.config + ' caller ' + CANARY.value);
        sinks.push({ name: 'config-clean', text: seeded });
        // A feature's name is not a field name: only the sensitive names inside
        // its settings register. An entity block, of per-entity settings or seeded
        // records keyed by entity name and id, is not read at all.
        const featured = new __1.SDK({ apikey: CANARY.apikey, feature: {
                zzsecrets: { active: false, kind: 'PLAINSETTING-q8w2e4r6' },
                zzfeat: { active: false, apitoken: 'FEATTOKEN-z9y8x7w6' },
                test: { active: false, entity: { zztoken: { ZZTOKEN01: { note: 'PLAINRECORD-t5r3e1w9' } } } },
            }, entity: { zztoken: { alias: { zzkey: 'PLAINALIAS-m2n4b6v8' } } } });
        const fctx = { options: featured._options };
        // The raw path returns its failure rather than throwing it.
        const raw = await makeSdk(SCENARIOS[3], sinks).direct({ path: 'raw' });
        (0, node_assert_1.ok)(false === raw.ok && null != raw.err, 'a transport failure should fail direct()');
        sinks.push(...forms('direct', raw.err));
        const leaked = sinks
            .map((s) => ({ name: s.name, found: leaks(s.text) }))
            .filter((s) => 0 < s.found.length);
        console.log('clean: swept ' + sinks.length + ' surface(s), ' + leaked.length + ' leak(s)');
        (0, node_assert_1.equal)(leaked.length, 0, 'credential leaked through: ' +
            leaked.map((l) => l.name + ' [' + l.found.join(', ') + ']').join('; '));
        // The positive half: the slot the credential travelled in is masked,
        // and an unregistered token in a response header is masked by name.
        const notfound = errors['notfound/throw'];
        (0, node_assert_1.ok)(null != notfound, 'the 404 scenario must throw');
        (0, node_assert_1.equal)(notfound.status, 404);
        if (!AUTH.suppressed) {
            const spec = notfound.spec || {};
            if ('query' === AUTH.where) {
                (0, node_assert_1.equal)(header(spec.query, AUTH.name), MASK);
            }
            else if ('cookie' === AUTH.where) {
                (0, node_assert_1.ok)(String(header(spec.headers, 'cookie')).includes(MASK), 'cookie: ' + header(spec.headers, 'cookie'));
            }
            else {
                (0, node_assert_1.ok)(String(header(spec.headers, AUTH.name)).endsWith(MASK), AUTH.name + ': ' + header(spec.headers, AUTH.name));
            }
        }
        (0, node_assert_1.equal)(header(notfound.spec.headers, 'x-custom-token'), MASK);
        (0, node_assert_1.equal)(seeded, 'config ' + MASK + ' caller ' + MASK);
        (0, node_assert_1.deepStrictEqual)(util.clean({ options: built }, { my_zzsens: 'x', other: 'y' }), { my_zzsens: MASK, other: 'y' });
        (0, node_assert_1.deepStrictEqual)(cfgclean, { keys: 'zzsens', values: CANARY.config });
        (0, node_assert_1.equal)(featured.utility().clean(fctx, 'kind PLAINSETTING-q8w2e4r6'), 'kind PLAINSETTING-q8w2e4r6');
        (0, node_assert_1.equal)(featured.utility().clean(fctx, 'token FEATTOKEN-z9y8x7w6'), 'token ' + MASK);
        (0, node_assert_1.equal)(featured.utility().clean(fctx, 'record PLAINRECORD-t5r3e1w9'), 'record PLAINRECORD-t5r3e1w9');
        (0, node_assert_1.equal)(featured.utility().clean(fctx, 'alias PLAINALIAS-m2n4b6v8'), 'alias PLAINALIAS-m2n4b6v8');
        const coded = errors['coded/throw'];
        (0, node_assert_1.ok)(null != coded, 'the coded scenario must throw');
        (0, node_assert_1.equal)(coded.code, 'denied_' + MASK);
        const explained = explains['ok/explain'] || {};
        (0, node_assert_1.ok)(null != explained.result, 'the explain record should carry the result');
        (0, node_assert_1.equal)(header(explained.result.headers, 'x-session-token'), MASK);
    });
    (0, node_test_1.test)('the sweep can see a leak: clean switched off shows the credential', async (t) => {
        const target = await usableOp();
        if (null == target) {
            return t.skip('no operation of this SDK completes against a plain 200; nothing to sweep');
        }
        const sinks = [];
        const sdk = makeSdk(SCENARIOS[1], sinks, { active: false });
        const err = await drive(sdk, target, {}, sinks);
        (0, node_assert_1.ok)(null != err);
        // Explaining a failure must not cost it its error.
        const explained = await drive(makeSdk(SCENARIOS[1], [], { active: false }), target, { explain: {} }, []);
        (0, node_assert_1.equal)(explained?.message, err.message, 'with clean off, explain lost the error');
        const leaked = sinks.filter((s) => 0 < leaks(s.text).length);
        (0, node_assert_1.ok)(0 < leaked.length, 'with clean off, nothing showed the canary: the sweep is blind');
        if (!AUTH.suppressed) {
            const text = JSON.stringify(err.spec);
            (0, node_assert_1.ok)(text.includes(CANARY.apikey) ||
                text.includes(Buffer.from(CANARY.apikey + ':' + CANARY.secret).toString('base64')), 'the raw spec should carry the credential when clean is off');
        }
    });
});
//# sourceMappingURL=clean.test.js.map