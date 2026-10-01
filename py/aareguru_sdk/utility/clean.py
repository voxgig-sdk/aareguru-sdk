# Aareguru SDK utility: clean

from __future__ import annotations
import base64
import json
from urllib.parse import quote

from aareguru_sdk.schema import OPTSPEC


# Everything that leaves the pipeline passes through clean: the error, the
# explain record, the serialised context, and whatever a feature emits.
# Two layers: every registered secret VALUE (and its encoded forms) is
# replaced wherever it appears in a string, and every value under a
# sensitive KEY name is masked whatever it holds. Inside the pipeline data
# stays raw, so a hook can still read the header it must add to.

_MAXDEPTH = 32
_CIRCULAR = "[circular]"

# A dropped value (a function) - distinct from None, which is data.
_DROP = object()


def _normkey(key):
    return str(key).lower().replace("-", "").replace("_", "")


def _splitkeys(keys):
    out = []
    for part in str("" if keys is None else keys).split(","):
        k = _normkey(part.strip())
        if k != "":
            out.append(k)
    return out


# The comma-separated literal values a caller registers; a list is taken
# as-is for a caller that has one.
def split_values(values):
    if isinstance(values, list):
        return [v for v in values if isinstance(v, str)]
    out = []
    for part in str("" if values is None else values).split(","):
        v = part.strip()
        if v != "":
            out.append(v)
    return out


# The spec carries numbers as strings, so every target reads it alike.
def _count(val, dflt):
    try:
        n = int(float(val))
    except (TypeError, ValueError):
        return dflt
    return n if n >= 0 else dflt


def _options_of(ctx):
    if isinstance(ctx, dict):
        return ctx.get("options")
    return getattr(ctx, "options", None)


# The derived block make_options builds; a context without options
# (make_error is reached with a bare one) falls back to the schema defaults,
# so nothing leaves raw for want of a constructor.
def _clean_config(ctx):
    options = _options_of(ctx)
    derived = options.get("__derived__") if isinstance(options, dict) else None
    cfg = derived.get("clean") if isinstance(derived, dict) else None
    if isinstance(cfg, dict) and isinstance(cfg.get("values"), list):
        return cfg
    return make_clean_config(OPTSPEC.get("clean"))


def make_clean_config(cleanopts):
    opts = cleanopts if isinstance(cleanopts, dict) else {}
    mask = opts.get("mask")
    return {
        "active": opts.get("active") is not False,
        "keys": _splitkeys(opts.get("keys")),
        "values": [],
        "mask": mask if isinstance(mask, str) else "[redacted]",
        "hint": _count(opts.get("hint"), 0),
        "min": max(1, _count(opts.get("min"), 4)),
    }


# The encoded forms a value travels in: Basic and Bearer both carry base64,
# a query credential is percent-encoded, and a JSON dump escapes it.
def _forms(value):
    out = [value]

    def add(s):
        if s != "" and s not in out:
            out.append(s)

    try:
        add(base64.b64encode(value.encode("utf-8")).decode("ascii"))
    except Exception:
        pass
    try:
        add(quote(value, safe="!~*'()"))
    except Exception:
        pass
    try:
        add(json.dumps(value, ensure_ascii=False)[1:-1])
        add(json.dumps(value)[1:-1])
    except Exception:
        pass
    return out


# Register a secret value. Idempotent; shorter than `min` is not a secret
# the SDK can mask without blanking ordinary text.
def clean_add_util(ctx, value):
    cfg = _clean_config(ctx)
    if not isinstance(value, str) or len(value) < cfg["min"]:
        return
    values = cfg["values"]
    changed = False
    for form in _forms(value):
        if len(form) >= cfg["min"] and form not in values:
            values.append(form)
            changed = True
    if changed:
        values.sort(key=len, reverse=True)


# Every scalar under a sensitive name, at any depth and of any shape: a
# credential mistyped as a map or a number is still a credential, and the
# validation error that rejects it quotes it.
def clean_add_sensitive(ctx, val, under=False, depth=0, seen=None):
    if val is None or _MAXDEPTH <= depth or isinstance(val, bool):
        return
    if isinstance(val, (str, int, float)):
        if under:
            text = str(int(val)) if isinstance(val, float) and val.is_integer() else str(val)
            clean_add_util(ctx, text)
        return
    if not isinstance(val, (dict, list, tuple)):
        return
    seen = [] if seen is None else seen
    if id(val) in seen:
        return
    seen.append(id(val))
    if isinstance(val, dict):
        for k, v in val.items():
            clean_add_sensitive(ctx, v, under or clean_key(ctx, k), depth + 1, seen)
    else:
        for v in val:
            clean_add_sensitive(ctx, v, under, depth + 1, seen)


def _mask_value(cfg, value):
    hint = cfg["hint"]
    if 0 < hint and len(value) > 2 * hint:
        return cfg["mask"] + value[-hint:]
    return cfg["mask"]


def _clean_string(cfg, text):
    out = text
    for value in cfg["values"]:
        if value in out:
            out = out.replace(value, _mask_value(cfg, value))
    return out


def _sensitive_key(cfg, key):
    if key is None or isinstance(key, bool) or isinstance(key, (int, float)):
        return False
    nk = _normkey(key)
    for k in cfg["keys"]:
        if k in nk:
            return True
    return False


def _is_function(val):
    return callable(val) and not isinstance(val, type)


# A plain-data copy of what is about to leave: a `to_json` hook is honoured
# (a context serialises as its record), functions are dropped, cycles are
# cut, and no live object is shared with the copy - masking the copy must
# never mask the pipeline's own spec.
def _snapshot(cfg, val, key, depth, seen):
    if val is None:
        return None

    if isinstance(val, str):
        return _mask_value(cfg, val) if _sensitive_key(cfg, key) else _clean_string(cfg, val)

    if isinstance(val, (bool, int, float)):
        return cfg["mask"] if _sensitive_key(cfg, key) else val

    if _is_function(val):
        return _DROP

    if _MAXDEPTH <= depth or id(val) in seen:
        return _CIRCULAR

    if _sensitive_key(cfg, key):
        return cfg["mask"]

    seen.append(id(val))
    try:
        if isinstance(val, dict):
            return _plain(cfg, val.items(), depth, seen)

        if isinstance(val, (list, tuple, set, frozenset)):
            out = []
            for i, item in enumerate(val):
                c = _snapshot(cfg, item, i, depth + 1, seen)
                out.append(None if c is _DROP else c)
            return out

        if isinstance(val, BaseException):
            out = {"message": _clean_string(cfg, str(val))}
            for k, v in _public(val):
                c = _snapshot(cfg, v, k, depth + 1, seen)
                if c is not _DROP:
                    out[k] = c
            return out

        to_json = getattr(val, "to_json", None)
        if callable(to_json):
            rec = to_json()
            if rec is not val:
                return _snapshot(cfg, rec, key, depth + 1, seen)

        if hasattr(val, "__dict__"):
            return _plain(cfg, _public(val), depth, seen)

        return _clean_string(cfg, str(val))
    finally:
        seen.pop()


# An object's own public attributes: the private ones hold the pipeline's
# live references (an entity's client, an error's context).
def _public(obj):
    return [(k, v) for k, v in vars(obj).items()
            if not str(k).startswith("_")]


def _plain(cfg, items, depth, seen):
    out = {}
    for k, v in items:
        c = _snapshot(cfg, v, k, depth + 1, seen)
        if c is not _DROP:
            out[_clean_name(cfg, out, str(k))] = c
    return out


# A registered value used as a property name is masked like any other
# string; names that mask alike take a counter, so none is lost.
def _clean_name(cfg, out, key):
    name = _clean_string(cfg, key)
    if name == key or name not in out:
        return name
    i = 1
    while name + "#" + str(i) in out:
        i += 1
    return name + "#" + str(i)


# An exception is cleaned IN PLACE: it is about to be raised, and its
# identity matters to the caller. The message lives in `args`.
def _clean_exception(cfg, err):
    args = tuple(_clean_string(cfg, a) if isinstance(a, str) else a for a in err.args)
    if args != err.args:
        err.args = args

    for k, v in _public(err):
        if isinstance(v, str):
            v = _mask_value(cfg, v) if _sensitive_key(cfg, k) else _clean_string(cfg, v)
        elif v is not None and not isinstance(v, (bool, int, float)) and not _is_function(v):
            v = _snapshot(cfg, v, k, 1, [])
        name = _clean_string(cfg, k)
        if name != k:
            delattr(err, k)
            name = _clean_name(cfg, vars(err), k)
        setattr(err, name, v)

    notes = getattr(err, "__notes__", None)
    if isinstance(notes, list):
        err.__notes__ = [_clean_string(cfg, n) if isinstance(n, str) else n for n in notes]


# Clean a value on its way out. A string is redacted; an exception is
# redacted in place; anything else comes back as a masked plain-data copy.
def clean_util(ctx, val):
    cfg = _clean_config(ctx)

    if cfg["active"] is False:
        return val

    if isinstance(val, str):
        return _clean_string(cfg, val)

    if isinstance(val, BaseException):
        _clean_exception(cfg, val)
        return val

    out = _snapshot(cfg, val, None, 0, [])
    return None if out is _DROP else out


# Is this key name sensitive under the context's clean configuration?
def clean_key(ctx, key):
    return _sensitive_key(_clean_config(ctx), key)
