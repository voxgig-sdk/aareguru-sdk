"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clean = clean;
exports.cleanAdd = cleanAdd;
exports.cleanAddSensitive = cleanAddSensitive;
exports.cleanKey = cleanKey;
exports.makeCleanConfig = makeCleanConfig;
exports.splitvalues = splitvalues;
const Schema_1 = require("../Schema");
// Everything that leaves the pipeline passes through clean; inside it data
// stays raw, so a hook can still read the header it must add to. See
// docs/explanation/secret-redaction.md.
const MAXDEPTH = 32;
const CIRCULAR = '[circular]';
function normkey(key) {
    return String(key).toLowerCase().replace(/[-_]/g, '');
}
function splitkeys(keys) {
    return String(null == keys ? '' : keys)
        .split(/\s*,\s*/)
        .map(normkey)
        .filter((k) => '' !== k);
}
function splitvalues(values) {
    if (Array.isArray(values)) {
        return values.filter((v) => 'string' === typeof v);
    }
    return String(null == values ? '' : values)
        .split(/\s*,\s*/)
        .filter((v) => '' !== v);
}
function count(val, dflt) {
    const n = Math.floor(Number(val));
    return Number.isFinite(n) && 0 <= n ? n : dflt;
}
// A context without options (makeError accepts a bare one) still masks by
// the schema defaults.
function cleanConfig(ctx) {
    const derived = ctx?.options?.__derived__?.clean;
    if (null != derived) {
        return derived;
    }
    return makeCleanConfig(Schema_1.OPTSPEC?.clean);
}
function makeCleanConfig(cleanopts) {
    const opts = cleanopts || {};
    return {
        active: false !== opts.active,
        keys: splitkeys(opts.keys),
        values: [],
        mask: 'string' === typeof opts.mask ? opts.mask : '[redacted]',
        hint: count(opts.hint, 0),
        min: Math.max(1, count(opts.min, 4)),
    };
}
// The encoded forms a value travels in.
function forms(value) {
    const out = [value];
    const add = (s) => { if ('' !== s && !out.includes(s))
        out.push(s); };
    try {
        add(Buffer.from(value, 'utf8').toString('base64'));
    }
    catch (_e) { }
    try {
        add(encodeURIComponent(value));
    }
    catch (_e) { }
    try {
        add(JSON.stringify(value).slice(1, -1));
    }
    catch (_e) { }
    return out;
}
function cleanAdd(ctx, value) {
    const cfg = cleanConfig(ctx);
    if ('string' !== typeof value || value.length < cfg.min) {
        return;
    }
    let changed = false;
    for (const form of forms(value)) {
        if (form.length >= cfg.min && !cfg.values.includes(form)) {
            cfg.values.push(form);
            changed = true;
        }
    }
    if (changed) {
        cfg.values.sort((a, b) => b.length - a.length);
    }
}
function maskValue(cfg, value) {
    if (0 < cfg.hint && value.length > 2 * cfg.hint) {
        return cfg.mask + value.slice(-cfg.hint);
    }
    return cfg.mask;
}
function cleanString(cfg, text) {
    let out = text;
    for (const value of cfg.values) {
        if (out.includes(value)) {
            out = out.split(value).join(maskValue(cfg, value));
        }
    }
    return out;
}
function sensitiveKey(cfg, key) {
    if (null == key || 'number' === typeof key) {
        return false;
    }
    const nk = normkey(key);
    for (const k of cfg.keys) {
        if (nk.includes(k)) {
            return true;
        }
    }
    return false;
}
// A masked plain-data copy: toJSON honoured, functions dropped, cycles cut,
// and nothing shared with the live value, whose spec must stay raw.
function snapshot(cfg, val, key, depth, seen) {
    if (null == val) {
        return val;
    }
    const t = typeof val;
    if ('string' === t) {
        return sensitiveKey(cfg, key) ? maskValue(cfg, val) : cleanString(cfg, val);
    }
    if ('function' === t) {
        return undefined;
    }
    if ('object' !== t) {
        return sensitiveKey(cfg, key) ? cfg.mask : val;
    }
    if (MAXDEPTH <= depth || seen.includes(val)) {
        return CIRCULAR;
    }
    if (sensitiveKey(cfg, key)) {
        return cfg.mask;
    }
    seen.push(val);
    try {
        if (Array.isArray(val)) {
            const out = [];
            for (let i = 0; i < val.length; i++) {
                out.push(snapshot(cfg, val[i], i, depth + 1, seen));
            }
            return out;
        }
        if (val instanceof Error) {
            const out = {
                message: cleanString(cfg, String(val.message)),
                stack: cleanString(cfg, String(val.stack || '')),
            };
            for (const k of Object.keys(val)) {
                const v = snapshot(cfg, val[k], k, depth + 1, seen);
                if (undefined !== v)
                    out[k] = v;
            }
            return out;
        }
        if ('function' === typeof val.toJSON) {
            const json = val.toJSON();
            return json === val ? plain(cfg, val, depth, seen) : snapshot(cfg, json, key, depth + 1, seen);
        }
        return plain(cfg, val, depth, seen);
    }
    finally {
        seen.pop();
    }
}
function plain(cfg, val, depth, seen) {
    const out = {};
    for (const k of Object.keys(val)) {
        const v = snapshot(cfg, val[k], k, depth + 1, seen);
        if (undefined !== v)
            out[cleanName(cfg, out, k)] = v;
    }
    return out;
}
// A registered value used as a property name is masked like any other
// string; names that mask alike take a counter, so none is lost.
function cleanName(cfg, out, key) {
    const name = cleanString(cfg, key);
    if (name === key || !Object.prototype.hasOwnProperty.call(out, name)) {
        return name;
    }
    let i = 1;
    while (Object.prototype.hasOwnProperty.call(out, name + '#' + i))
        i++;
    return name + '#' + i;
}
// An Error is cleaned in place, since it is about to be thrown.
function clean(ctx, val) {
    const cfg = cleanConfig(ctx);
    if (false === cfg.active) {
        return val;
    }
    if ('string' === typeof val) {
        return cleanString(cfg, val);
    }
    if (val instanceof Error) {
        val.message = cleanString(cfg, String(val.message));
        if ('string' === typeof val.stack) {
            val.stack = cleanString(cfg, val.stack);
        }
        for (const k of Object.keys(val)) {
            let v = val[k];
            if ('string' === typeof v) {
                v = sensitiveKey(cfg, k) ? maskValue(cfg, v) : cleanString(cfg, v);
            }
            else if (null != v && 'object' === typeof v) {
                v = snapshot(cfg, v, k, 1, []);
            }
            const name = cleanString(cfg, k);
            if (name !== k) {
                delete val[k];
            }
            val[name === k ? k : cleanName(cfg, val, k)] = v;
        }
        return val;
    }
    return snapshot(cfg, val, undefined, 0, []);
}
function cleanKey(ctx, key) {
    return sensitiveKey(cleanConfig(ctx), key);
}
// Every scalar under a sensitive name, at any depth and of any shape: a
// credential mistyped as an object or a number is still a credential, and
// the validation error that rejects it quotes it.
function cleanAddSensitive(ctx, val, under = false, depth = 0, seen = [], parent) {
    if (null == val || MAXDEPTH <= depth) {
        return;
    }
    const t = typeof val;
    if ('string' === t || 'number' === t || 'bigint' === t) {
        if (under)
            cleanAdd(ctx, String(val));
        return;
    }
    if ('object' !== t || seen.includes(val)) {
        return;
    }
    seen.push(val);
    // The keys under `feature` name features, not fields: `secrets` is no secret.
    const named = !(1 === depth && 'feature' === parent);
    for (const k of Object.keys(val)) {
        cleanAddSensitive(ctx, val[k], under || (named && cleanKey(ctx, k)), depth + 1, seen, k);
    }
}
//# sourceMappingURL=CleanUtility.js.map