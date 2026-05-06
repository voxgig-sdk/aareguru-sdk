# Aareguru SDK test runner

from __future__ import annotations
import os
import json

from utility.voxgig_struct import voxgig_struct as vs


class AareguruTestRunner:
    _env = {}

    @staticmethod
    def load_env_local():
        try:
            with open("../../.env.local", "r") as f:
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
        live = AareguruTestRunner.getenv("AAREGURU_TEST_LIVE")
        override = AareguruTestRunner.getenv("AAREGURU_TEST_OVERRIDE")

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

        explain = AareguruTestRunner.getenv("AAREGURU_TEST_EXPLAIN")
        if explain is not None and explain != "":
            m["AAREGURU_TEST_EXPLAIN"] = explain

        return m

    @staticmethod
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


def entity_list_to_data(lst):
    return AareguruTestRunner.entity_list_to_data(lst)
