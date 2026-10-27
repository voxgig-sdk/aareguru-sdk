import {
  cmp,
  File,
  Content,
  isAuthSuppressed,
  isHttpBasicAuth,
  resolveAuthIn,
  resolveAuthName,
} from '@voxgig/sdkgen'


// The canary sweep: every credential slot holds a distinctive value, every
// diagnostic feature this SDK ships is switched on with a capturing sink, a
// real operation runs through every outcome, and every string that leaves
// the SDK is searched for the canaries and their encoded forms. It also
// proves its own sensitivity: with clean switched off the canary MUST show.
const TestClean = cmp(function TestClean(props: any) {
  const { model } = props.ctx$
  const { target } = props

  const auth = {
    suppressed: isAuthSuppressed(model),
    where: resolveAuthIn(model),
    name: 'header' === resolveAuthIn(model)
      ? resolveAuthName(model).toLowerCase() : resolveAuthName(model),
    basic: isHttpBasicAuth(model),
  }

  File({ name: 'test_clean.' + target.ext }, () => Content(render(model.const.Name, auth)))
})


function render(Name: string, auth: {
  suppressed: boolean, where: string, name: string, basic: boolean
}): string {
  const pkg = Name.toLowerCase() + '_sdk'

  return `# ${Name} SDK clean test
#
# The canary sweep: no credential leaves the SDK in any form.

import base64
import json
import traceback
from urllib.parse import quote

import pytest

from ${pkg} import ${Name}SDK
from ${pkg}.core.error import ${Name}Error
from ${pkg}.feature.base_feature import ${Name}BaseFeature
from test.feature_harness import has_feature


# Generated: the credential's wire placement is fixed when the SDK is built.
AUTH = ${JSON.stringify(auth)
    .replace(/true/g, 'True').replace(/false/g, 'False')}

CANARY = {
    "apikey": "CANARY-APIKEY-k9x2m7q4p1",
    "secret": "CANARY-SECRET-w3e8r5t2y6",
    "header": "CANARY-HEADER-z1x4c7v0b3",
    "value": "CANARY-VALUE-n5m8b2v9c4",
    "config": "CANARY-CONFIG-h6j3k8l2m5",
}

MASK = "[redacted]"

NO_OP = "no operation of this SDK completes against a plain 200; nothing to sweep"


def _b64(s):
    return base64.b64encode(s.encode("utf-8")).decode("ascii")


# Every form a canary can travel in.
FORMS = []
for _v in CANARY.values():
    FORMS.extend([_v, _b64(_v), quote(_v, safe="")])
FORMS.append(_b64(CANARY["apikey"] + ":" + CANARY["secret"]))


# Header maps keep the caller's spelling; the assertion should not care.
def _header(m, name):
    for k in (m or {}):
        if str(k).lower() == name.lower():
            return m[k]
    return None


def _leaks(text):
    return [f for f in FORMS if f in text]


def _plain(v):
    return v if isinstance(v, dict) or v is None else vars(v)


# Every default print of a value: json, str and repr, plus what an
# exception shows a traceback and an attribute dump.
def _forms(name, val):
    out = []

    def push(kind, fn):
        try:
            out.append((name + ":" + kind, fn()))
        except Exception:
            pass

    push("json", lambda: json.dumps(val, default=str))
    push("str", lambda: str(val))
    push("repr", lambda: repr(val))
    if isinstance(val, BaseException):
        push("message", lambda: str(val.args))
        push("traceback", lambda: "".join(traceback.format_exception(val)))
        push("vars", lambda: json.dumps(vars(val), default=str))
        push("spec", lambda: json.dumps(_plain(getattr(val, "spec", None)), default=str))
        push("result", lambda: json.dumps(_plain(getattr(val, "result", None)), default=str))
    if callable(getattr(val, "to_json", None)):
        push("to_json", lambda: json.dumps(val.to_json(), default=str))
    if callable(getattr(val, "data_get", None)):
        push("data", lambda: json.dumps(val.data_get(), default=str))
    return out


# Captures the serialised context from inside the pipeline: what a hook
# author would hand to a logger.
class _CaptureFeature(${Name}BaseFeature):
    def __init__(self, sinks):
        super().__init__()
        self.name = "capture"
        self.version = "0.0.1"
        self.active = True
        self._sinks = sinks

    def init(self, ctx, options):
        pass

    def PreRequest(self, ctx):
        self._sinks.extend(_forms("ctx@PreRequest", ctx))

    def PreResponse(self, ctx):
        self._sinks.extend(_forms("ctx@PreResponse", ctx))

    # The SDK's own error as a hook reads it, which an observability
    # feature logs.
    def PreUnexpected(self, ctx):
        self._sinks.extend(_forms("ctx@PreUnexpected", ctx))
        if isinstance(ctx.ctrl.err, ${Name}Error):
            self._sinks.extend(_forms("ctrl.err@PreUnexpected", ctx.ctrl.err))


def _response(status, data, headers=None):
    h = {"content-type": "application/json"}
    h.update(headers or {})
    return {
        "status": status,
        "statusText": "OK" if status < 400 else "ERR",
        "headers": h,
        "json": lambda: data,
        "body": json.dumps(data),
    }


def _notjson():
    def raise_json():
        raise ValueError("Unexpected token < in JSON")
    return {
        "status": 200,
        "statusText": "OK",
        "headers": {},
        "json": raise_json,
        "body": "<html>",
    }


# The transport answers a (response, error) pair; a transport error is the
# pair with the error set, and its message quotes the URL.
SCENARIOS = [
    ("ok", lambda url, fetchdef: (_response(200, {"id": "i1", "name": "n1"},
                                            {"x-session-token": "RESP-TOKEN-a1b2c3d4e5"}), None)),
    ("notfound", lambda url, fetchdef: (_response(404, {"error": "no such record"}), None)),
    ("server", lambda url, fetchdef: (_response(500, {"error": "boom"}), None)),
    ("transport", lambda url, fetchdef: (None, RuntimeError('socket hang up (URL was: "' + url + '")'))),
    # The SDK's own error, its code quoting a registered value.
    ("coded", lambda url, fetchdef: (None, ${Name}Error("denied_" + CANARY["apikey"], "coded failure"))),
    ("notjson", lambda url, fetchdef: (_notjson(), None)),
]


# Offline, as every generated suite is: the test OPTION resolves a required
# server variable to test-<name>, and installs no transport.
def _offline(opts):
    return dict(opts, test={"active": True})


# A client the sweep cannot build leaves nothing swept: a harness error, not a leak.
def _construct(opts):
    try:
        return ${Name}SDK(_offline(opts))
    except Exception as e:
        raise RuntimeError(
            "clean harness: the client could not be constructed, so nothing was swept: "
            + str(e)) from e


def _make_sdk(respond, sinks, cleanopts=None, extra=None, auth=None):
    def capture(name):
        return lambda rec, *a: sinks.extend(_forms(name, rec))

    feature = {}
    if has_feature("log"):
        logger = {}
        for level in ["trace", "debug", "info", "warn", "error", "fatal"]:
            logger[level] = capture("log." + level)
        feature["log"] = {"active": True, "logger": logger}
    if has_feature("debug"):
        feature["debug"] = {"active": True, "onEntry": capture("debug")}
    if has_feature("audit"):
        feature["audit"] = {"active": True, "sink": capture("audit")}
    if has_feature("telemetry"):
        feature["telemetry"] = {"active": True, "exporter": capture("telemetry")}
    if has_feature("cost"):
        feature["cost"] = {"active": True, "sink": capture("cost")}
    if has_feature("metrics"):
        feature["metrics"] = {"active": True}
    if has_feature("clienttrack"):
        feature["clienttrack"] = {"active": True}

    clean = {"values": CANARY["value"]}
    clean.update(cleanopts or {})

    opts = {
        "apikey": CANARY["apikey"],
        "secret": CANARY["secret"],
        "headers": {"X-Custom-Token": CANARY["header"]},
        "clean": clean,
        "feature": feature,
        "extend": [_CaptureFeature(sinks)] + list(extra or []),
        "utility": {"fetcher": lambda ctx, url, fetchdef: respond(url, fetchdef)},
    }
    if auth is not None:
        opts["auth"] = auth
    return _construct(opts)


# The first operation that completes against a plain 200: with no
# arguments, else with every path parameter its points declare filled in.
def _usable_op():
    def plain():
        return _construct({
            "apikey": CANARY["apikey"],
            "utility": {"fetcher": lambda ctx, url, fetchdef: (_response(200, {"id": "i1"}), None)},
        })

    client = plain()
    entities = (client.get_root_ctx().config or {}).get("entity") or {}
    found = {}
    for attr in dir(client):
        if not attr[:1].isupper():
            continue
        acc = getattr(client, attr, None)
        if not callable(acc):
            continue
        try:
            ent = acc()
        except Exception:
            continue
        getname = getattr(ent, "get_name", None)
        if not callable(getname):
            continue
        name = getname()
        if isinstance(name, str) and name != "":
            found[name] = (attr, ent)

    safe = {"list": 0, "load": 1}
    for name in sorted(found):
        accessor, ent = found[name]
        ops = [op for op in ["list", "load", "create", "update", "patch", "remove"]
               if callable(getattr(ent, op, None))]
        ops.sort(key=lambda o: safe.get(o, 2))
        opdefs = (entities.get(name) or {}).get("op") or {}
        for op in ops:
            filled = {}
            for point in (opdefs.get(op) or {}).get("points") or []:
                for p in ((point or {}).get("args") or {}).get("params") or []:
                    if isinstance((p or {}).get("name"), str):
                        filled[p["name"]] = "p1"
            for match in [{}, filled]:
                try:
                    getattr(getattr(plain(), accessor)(), op)(dict(match), {})
                    return (accessor, op, match)
                except Exception:
                    continue
    return None


# A feature that raises from inside the pipeline, quoting the request it
# saw: an error make_error never handled. Its PreUnexpected variant raises
# where that hook fires: make_error, and the catch path before its cleaning.
class _ThrowFeature(${Name}BaseFeature):
    def __init__(self, response=True, unexpected=False):
        super().__init__()
        self.name = "throwhook"
        self.version = "0.0.1"
        self.active = True
        self._response = response
        self._unexpected = unexpected

    def init(self, ctx, options):
        pass

    def PreResponse(self, ctx):
        if self._response:
            raise RuntimeError("hook saw " + json.dumps(vars(ctx.spec), default=str))

    def PreUnexpected(self, ctx):
        if self._unexpected:
            raise RuntimeError("hook saw " + json.dumps(vars(ctx.spec), default=str))


# A stream that fails while the caller iterates it, quoting a credential.
class _StreamThrowFeature(${Name}BaseFeature):
    def __init__(self):
        super().__init__()
        self.name = "streamthrow"
        self.version = "0.0.1"
        self.active = True

    def init(self, ctx, options):
        pass

    def PreDone(self, ctx):
        def fail():
            raise RuntimeError("stream saw " + CANARY["apikey"])
            yield
        ctx.result.stream = fail


# A stream that succeeds, so the pipeline's terminal step never runs.
class _StreamOkFeature(${Name}BaseFeature):
    def __init__(self):
        super().__init__()
        self.name = "streamok"
        self.version = "0.0.1"
        self.active = True

    def init(self, ctx, options):
        pass

    def PreDone(self, ctx):
        data = ctx.result.resdata
        items = data if isinstance(data, list) else ([] if data is None else [data])
        ctx.result.stream = lambda: iter(items)


def _drive(sdk, target, ctrl, sinks):
    # A caller may keep the record it passed rather than read ctrl["explain"].
    held = ctrl.get("explain")
    entity = getattr(sdk, target[0])()
    out = None
    err = None
    try:
        out = getattr(entity, target[1])(dict(target[2]), ctrl)
    except Exception as e:
        err = e
    if err is not None:
        sinks.extend(_forms("error", err))
    if out is not None:
        sinks.extend(_forms("result", out))
    # Raw, as a caller copying the match into another query reads it.
    sinks.extend(_forms("match", entity.match_get()))
    if ctrl.get("explain") is not None:
        sinks.extend(_forms("explain", ctrl["explain"]))
    if held is not None and held is not ctrl.get("explain"):
        sinks.extend(_forms("explain:held", held))
    return err


class TestClean:

    def test_no_credential_leaves_the_sdk_in_any_form(self):
        target = _usable_op()
        if target is None:
            pytest.skip(NO_OP)

        sinks = []
        errors = {}
        explains = {}

        for sname, respond in SCENARIOS:
            for vname, make_ctrl in [
                ("throw", lambda: {}),
                ("explain", lambda: {"explain": {}}),
                ("nothrow", lambda: {"throw": False, "explain": {}}),
            ]:
                sdk = _make_sdk(respond, sinks)
                ctrl = make_ctrl()
                err = _drive(sdk, target, ctrl, sinks)
                key = sname + "/" + vname
                if err is not None:
                    errors[key] = err
                if ctrl.get("explain") is not None:
                    explains[key] = ctrl["explain"]
                sinks.extend(_forms("sdk", sdk))
                sinks.append(("sdk:vars", json.dumps(vars(sdk), default=repr)))

        # A name given at run time replaces the declared one: the match
        # leaves out whichever name prepare_auth placed.
        _drive(_make_sdk(SCENARIOS[0][1], sinks, auth={"name": "zzcred"}), target, {}, sinks)

        # A credential mistyped as a map is rejected by validation, whose
        # message quotes the value it rejected.
        rejected = None
        try:
            ${Name}SDK(_offline(
                {"apikey": {"value": CANARY["apikey"]}, "clean": {"values": CANARY["value"]}}))
        except Exception as e:
            rejected = e
        assert rejected is not None, "a credential mistyped as a map should be rejected"
        sinks.extend(_forms("rejected", rejected))

        # An error a feature hook raises, quoting the request, skips make_error,
        # as does the explain record it interrupts. The variant raising only in
        # PreUnexpected reaches make_error's own firing through a 404.
        for respond, hook in [
                (SCENARIOS[0][1], _ThrowFeature()),
                (SCENARIOS[0][1], _ThrowFeature(unexpected=True)),
                (SCENARIOS[1][1], _ThrowFeature(response=False, unexpected=True))]:
            hooked = _make_sdk(respond, sinks, None, [hook])
            hookerr = _drive(hooked, target, {"explain": {}}, sinks)
            assert hookerr is not None, "the throwing hook should fail the operation"

        # Iterating a stream runs inside the same catch path as the operation,
        # and the explain record the caller passed is cleaned however it ends.
        for name, extra in [("stream", [_StreamThrowFeature()]),
                            ("stream-ok", [_StreamOkFeature()]), ("stream-plain", [])]:
            streamed = _make_sdk(SCENARIOS[0][1], sinks, None, extra)
            explain = {}
            streamerr = None
            try:
                for _item in getattr(streamed, target[0])().stream(
                        target[1], {"reqmatch": dict(target[2])}, {"ctrl": {"explain": explain}}):
                    pass
            except Exception as e:
                streamerr = e
            assert ("stream" == name) == (streamerr is not None), name + ": only the failing stream raises"
            if streamerr is not None:
                sinks.extend(_forms(name, streamerr))
            assert 0 < len(explain), name + ": the explain record was not filled"
            sinks.extend(_forms(name + ":explain", explain))

        # A registered value used as a property name is masked; names that
        # mask alike are kept apart.
        util = hooked.get_utility()
        rootctx = hooked.get_root_ctx()
        named = util.clean(rootctx, {CANARY["value"]: 1, CANARY["header"]: 2, "plain": 3})
        sinks.extend(_forms("named", named))
        assert named == {MASK: 1, MASK + "#1": 2, "plain": 3}, named
        err = RuntimeError("boom")
        setattr(err, CANARY["value"], "x")
        util.clean(rootctx, err)
        sinks.extend(_forms("named-error", err))
        assert CANARY["value"] not in vars(err) and vars(err).get(MASK) == "x", vars(err)

        # The generated config's own clean block is read beside the caller's,
        # and is not changed by it.
        cfgclean = {"keys": "zzsens", "values": CANARY["config"]}
        built = util.make_options(util.make_context({
            "utility": util,
            "config": {"options": {"clean": cfgclean}},
            "options": {"clean": {"values": CANARY["value"]}},
        }, None))
        cfgctx = util.make_context({"options": built}, None)
        seeded = util.clean(cfgctx, "config " + CANARY["config"] + " caller " + CANARY["value"])
        sinks.append(("config-clean", seeded))
        assert seeded == "config " + MASK + " caller " + MASK, seeded
        bykey = util.clean(cfgctx, {"my_zzsens": "x", "other": "y"})
        assert bykey == {"my_zzsens": MASK, "other": "y"}, bykey
        assert cfgclean == {"keys": "zzsens", "values": CANARY["config"]}, cfgclean

        # With no clean option at all, the schema defaults still apply.
        bare = _construct({
            "apikey": CANARY["apikey"],
            "secret": CANARY["secret"],
            "headers": {"X-Custom-Token": CANARY["header"]},
            "utility": {"fetcher": lambda ctx, url, fetchdef: SCENARIOS[1][1](url, fetchdef)},
        })
        assert _drive(bare, target, {"explain": {}}, sinks) is not None, "the 404 should fail"

        # A feature's name is not a field name: only the sensitive names
        # inside its settings register. An entity block, of per-entity
        # settings or seeded records keyed by entity name and id, is not read,
        # and nor are rbac's rules, keyed by entity and operation names.
        featured = _construct({
            "apikey": CANARY["apikey"],
            "feature": {
                "zzsecrets": {"active": False, "kind": "PLAINSETTING-q8w2e4r6"},
                "zzfeat": {"active": False, "apitoken": "FEATTOKEN-z9y8x7w6"},
                "rbac": {"active": False, "rules": {"zztoken.load": "PLAINRULE-k7j5h3g1"}},
                "test": {"active": False, "entity": {
                    "zztoken": {"ZZTOKEN01": {"note": "PLAINRECORD-t5r3e1w9"}}}},
            },
            "entity": {"zztoken": {"alias": {"zzkey": "PLAINALIAS-m2n4b6v8"}}},
        })
        fclean = featured.get_utility().clean
        froot = featured.get_root_ctx()
        fplain = fclean(froot, "kind PLAINSETTING-q8w2e4r6")
        ftoken = fclean(froot, "token FEATTOKEN-z9y8x7w6")
        frecord = fclean(froot, "record PLAINRECORD-t5r3e1w9")
        falias = fclean(froot, "alias PLAINALIAS-m2n4b6v8")
        frule = fclean(froot, "rule PLAINRULE-k7j5h3g1")

        leaked = [(name, _leaks(text)) for name, text in sinks]
        leaked = [(name, found) for name, found in leaked if 0 < len(found)]

        print("clean: swept " + str(len(sinks)) + " surface(s), " + str(len(leaked)) + " leak(s)")

        assert len(leaked) == 0, "credential leaked through: " + "; ".join(
            name + " [" + ", ".join(found) + "]" for name, found in leaked)

        # The positive half: the slot the credential travelled in is masked,
        # and an unregistered token in a response header is masked by name.
        notfound = errors.get("notfound/throw")
        assert notfound is not None, "the 404 scenario must raise"
        assert notfound.status == 404
        spec = notfound.spec or {}
        if not AUTH["suppressed"]:
            if "query" == AUTH["where"]:
                assert _header(spec.get("query"), AUTH["name"]) == MASK
            elif "cookie" == AUTH["where"]:
                cookie = str(_header(spec.get("headers"), "cookie"))
                assert MASK in cookie, "cookie: " + cookie
            else:
                cred = str(_header(spec.get("headers"), AUTH["name"]))
                assert cred.endswith(MASK), AUTH["name"] + ": " + cred
        assert _header(spec.get("headers"), "x-custom-token") == MASK

        coded = errors.get("coded/throw")
        assert coded is not None and coded.code == "denied_" + MASK, repr(coded)

        assert fplain == "kind PLAINSETTING-q8w2e4r6", fplain
        assert ftoken == "token " + MASK, ftoken
        assert frecord == "record PLAINRECORD-t5r3e1w9", frecord
        assert falias == "alias PLAINALIAS-m2n4b6v8", falias
        assert frule == "rule PLAINRULE-k7j5h3g1", frule

        explained = explains.get("ok/explain") or {}
        assert explained.get("result") is not None, "the explain record should carry the result"
        assert _header(explained["result"].get("headers"), "x-session-token") == MASK

    def test_the_sweep_can_see_a_leak_with_clean_switched_off(self):
        target = _usable_op()
        if target is None:
            pytest.skip(NO_OP)

        sinks = []
        sdk = _make_sdk(SCENARIOS[1][1], sinks, {"active": False})
        err = _drive(sdk, target, {}, sinks)
        assert err is not None

        # Explaining a failure must not cost it its error.
        explained = _drive(_make_sdk(SCENARIOS[1][1], [], {"active": False}), target, {"explain": {}}, [])
        assert str(explained) == str(err), "with clean off, explain lost the error: " + str(explained)

        leaked = [name for name, text in sinks if 0 < len(_leaks(text))]
        assert 0 < len(leaked), "with clean off, nothing showed the canary: the sweep is blind"

        if not AUTH["suppressed"]:
            text = json.dumps(_plain(err.spec), default=str)
            assert CANARY["apikey"] in text or \\
                _b64(CANARY["apikey"] + ":" + CANARY["secret"]) in text, \\
                "the raw spec should carry the credential when clean is off"
`
}


export {
  TestClean
}
