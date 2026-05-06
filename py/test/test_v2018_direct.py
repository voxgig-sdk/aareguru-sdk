# V2018 direct test

import json
import pytest

from utility.voxgig_struct import voxgig_struct as vs
from aareguru_sdk import AareguruSDK
from core import helpers
from test import runner


class TestV2018Direct:

    def test_should_direct_load_v2018(self):
        setup = _v2018_direct_setup({"id": "direct01"})
        client = setup["client"]


        result, err = client.direct({
            "path": "v2018/history",
            "method": "GET",
            "params": {},
        })
        assert err is None
        assert result["ok"] is True
        assert helpers.to_int(result["status"]) == 200
        assert result["data"] is not None

        if not setup["live"]:
            if isinstance(result["data"], dict):
                assert result["data"]["id"] == "direct01"
            assert len(setup["calls"]) == 1



def _v2018_direct_setup(mockres):
    runner.load_env_local()

    calls = []

    env = runner.env_override({
        "AAREGURU_TEST_V_____ENTID": {},
        "AAREGURU_TEST_LIVE": "FALSE",
        "AAREGURU_APIKEY": "NONE",
    })

    live = env.get("AAREGURU_TEST_LIVE") == "TRUE"

    if live:
        merged_opts = {
            "apikey": env.get("AAREGURU_APIKEY"),
        }
        client = AareguruSDK(merged_opts)
        return {
            "client": client,
            "calls": calls,
            "live": True,
            "idmap": {},
        }

    def mock_fetch(url, init):
        calls.append({"url": url, "init": init})
        return {
            "status": 200,
            "statusText": "OK",
            "headers": {},
            "json": lambda: mockres if mockres is not None else {"id": "direct01"},
            "body": "mock",
        }, None

    client = AareguruSDK({
        "base": "http://localhost:8080",
        "system": {
            "fetch": mock_fetch,
        },
    })

    return {
        "client": client,
        "calls": calls,
        "live": False,
        "idmap": {},
    }
