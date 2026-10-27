# Aareguru SDK test runner

from __future__ import annotations
import os
import json

from projectname_sdk.utility.voxgig_struct import voxgig_struct as vs


class AareguruTestRunner:
    _env = {}

    @staticmethod
    def load_env_local():
        try:
            with open("../../.env.local", "r", encoding="utf-8") as f:
                content = f.read()
        except (FileNotFoundError, IOError):
            return

        for line in content.splitlines():
            line = line.strip()
            if line == "" or line.startswith("#"):
                continue
            eq_idx = line.find("=")
            if eq_idx < 0:
                continue
            key = line[:eq_idx].strip()
            val = line[eq_idx + 1:].strip()
            AareguruTestRunner._env[key] = val

    @staticmethod
    def getenv(key):
        val = AareguruTestRunner._env.get(key)
        if val is not None:
            return val
        return os.environ.get(key)

    @staticmethod
    def env_override(m):
        live = AareguruTestRunner.getenv("PROJECTENV_TEST_LIVE")
        override = AareguruTestRunner.getenv("PROJECTENV_TEST_OVERRIDE")

        if live == "TRUE" or override == "TRUE":
            for key in list(m.keys()):
                envval = AareguruTestRunner.getenv(key)
                if envval is not None and envval != "":
                    envval = envval.strip()
                    if envval.startswith("{"):
                        try:
                            parsed = json.loads(envval)
                            if parsed is not None:
                                m[key] = parsed
                                continue
                        except Exception:
                            pass
                    m[key] = envval

        explain = AareguruTestRunner.getenv("PROJECTENV_TEST_EXPLAIN")
        if explain is not None and explain != "":
            m["PROJECTENV_TEST_EXPLAIN"] = explain

        return m

    _test_control = None

    @staticmethod
    def load_test_control():
        """Load sdk-test-control.json from this test dir; cache after first read.
        Returns a dict with the empty-skip default if the file is missing or invalid
        so tests never crash on a bad config.
        """
        if AareguruTestRunner._test_control is not None:
            return AareguruTestRunner._test_control
        ctrl_path = os.path.join(os.path.dirname(__file__), "sdk-test-control.json")
        try:
            with open(ctrl_path, "r", encoding="utf-8") as f:
                AareguruTestRunner._test_control = json.load(f)
        except (FileNotFoundError, IOError, ValueError):
            AareguruTestRunner._test_control = {
                "version": 1,
                "test": {"skip": {
                    "live": {"direct": [], "entityOp": []},
                    "unit": {"direct": [], "entityOp": []},
                }},
            }
        return AareguruTestRunner._test_control

    @staticmethod
    def is_control_skipped(kind, name, mode):
        """Check sdk-test-control.json for a skip entry. Returns (skip, reason)."""
        ctrl = AareguruTestRunner.load_test_control()
        skip = ctrl.get("test", {}).get("skip", {}).get(mode, {}) or {}
        items = skip.get(kind, []) or []
        for item in items:
            if kind == "direct" and item.get("test") == name:
                return True, item.get("reason")
            if kind == "entityOp":
                key = (item.get("entity") or "") + "." + (item.get("op") or "")
                if key == name:
                    return True, item.get("reason")
        return False, None

    @staticmethod
    def live_client_options():
        """Extra SDK options every LIVE client is constructed with, from
        sdk-test-control.json `test.client.options`.

        The generated live client knows two things: the base URL (from the
        spec) and the credential (from the environment). Everything else
        about how a particular API wants to be talked to - which features to
        switch on, and with what settings - is a property of THAT API, known
        to the project and to nothing in the toolchain.

        Merged UNDER the generated fields, so the suite's own
        base/apikey/server values win: this ADDS to the live client, it does
        not redirect it.

        Reserved fields are stripped HERE rather than at each merge site:
        the generated dict only names a field when the model calls for one,
        so a "base" in this block would face no competing value and would
        silently redirect the whole suite - credential included - to another
        host.
        """
        ctrl = AareguruTestRunner.load_test_control()
        opts = ctrl.get("test", {}).get("client", {}).get("options")
        if not isinstance(opts, dict):
            return {}
        reserved = ("base", "prefix", "suffix", "server", "apikey", "secret")
        return {k: v for k, v in opts.items() if k not in reserved}

    @staticmethod
    def live_delay_ms():
        """Per-test live pacing delay (ms); default 500."""
        ctrl = AareguruTestRunner.load_test_control()
        v = ctrl.get("test", {}).get("live", {}).get("delayMs")
        if isinstance(v, int) and v >= 0:
            return v
        return 500

    @staticmethod
    def entity_data(v):
        """Extract the data map from an op result.

        Every entity operation resolves to the ENTITY (see AGENTS.md), so a
        flow test that wants the record takes this hop. A plain dict passes
        through unchanged.
        """
        if hasattr(v, "data_get") and callable(v.data_get):
            return v.data_get()
        return v

    def entity_list_to_data(lst):
        out = []
        for item in lst:
            if isinstance(item, dict):
                out.append(item)
            elif hasattr(item, "data_get") and callable(item.data_get):
                d = item.data_get()
                if isinstance(d, dict):
                    out.append(d)
            else:
                out.append(item)
        return out


# Module-level convenience functions.
def load_env_local():
    AareguruTestRunner.load_env_local()


def env_override(m):
    return AareguruTestRunner.env_override(m)


def entity_data(v):
    return AareguruTestRunner.entity_data(v)


def entity_list_to_data(lst):
    return AareguruTestRunner.entity_list_to_data(lst)


def is_control_skipped(kind, name, mode):
    return AareguruTestRunner.is_control_skipped(kind, name, mode)


def load_test_control():
    return AareguruTestRunner.load_test_control()


def live_client_options():
    return AareguruTestRunner.live_client_options()


def live_delay_ms():
    return AareguruTestRunner.live_delay_ms()


def live_miss(strict, reason):
    """A live check that did not pass, as main.kit.test.live.strict decides:
    strict fails the test, lenient skips it with the same reason."""
    import pytest
    if strict:
        pytest.fail(reason, pytrace=False)
    pytest.skip(reason)


def live_empty(reason):
    """An account holding no record for the test to read skips either way."""
    import pytest
    pytest.skip(reason)


def live_list(data):
    """A live list response's records: the body, or the first list an
    envelope object holds."""
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for value in data.values():
            if isinstance(value, list):
                return value
    return None


def live_describe(result):
    """A live response for a message: the SDK's error, or else its status
    and content type, never its body."""
    err = result.get("err") if isinstance(result, dict) else None
    if err is not None:
        return str(err)
    headers = result.get("headers") if isinstance(result, dict) else None
    ctype = None
    if isinstance(headers, dict):
        ctype = next((v for k, v in headers.items() if str(k).lower() == "content-type"), None)
    return "HTTP " + str(result.get("status") if isinstance(result, dict) else None) + \
        (" " + str(ctype).split(";")[0].strip() if ctype else "")


def live_existing(setup, strict, name, list_call):
    """Finds the record a create-less flow reads live: the first its list
    returns, put where the flow reads the fixture's existing records."""
    try:
        found = list_call()
    except Exception as err:
        live_miss(strict, f"Live list discovery failed: {err}")
    if not isinstance(found, list):
        live_miss(strict, "Live list discovery returned no list")
    if 0 == len(found):
        live_empty(f"The account has no {name} record to load")
    existing = setup["data"].setdefault("existing", {})
    existing[name] = {"live01": entity_data(found[0])}


def live_observe(live_env, strict):
    """A flow test decorator: in a lenient live run a failing check skips
    the test, observing the live API rather than failing on it."""
    import functools

    def wrap(fn):
        @functools.wraps(fn)
        def run(*args, **kwargs):
            try:
                return fn(*args, **kwargs)
            except Exception as err:
                if strict or "TRUE" != os.environ.get(live_env):
                    raise
                import pytest
                pytest.skip(f"live run, main.kit.test.live.strict is false: {err!r}")
        return run
    return wrap
