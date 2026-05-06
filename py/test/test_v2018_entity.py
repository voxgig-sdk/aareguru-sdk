# V2018 entity test

import json
import os
import time

import pytest

from utility.voxgig_struct import voxgig_struct as vs
from aareguru_sdk import AareguruSDK
from core import helpers

_TEST_DIR = os.path.dirname(os.path.abspath(__file__))
from test import runner


class TestV2018Entity:

    def test_should_create_instance(self):
        testsdk = AareguruSDK.test(None, None)
        ent = testsdk.V2018(None)
        assert ent is not None

    def test_should_run_basic_flow(self):
        setup = _v2018_basic_setup(None)
        client = setup["client"]

        # Bootstrap entity data from existing test data.
        v2018_ref01_data_raw = vs.items(helpers.to_map(
            vs.getpath(setup["data"], "existing.v2018")))
        v2018_ref01_data = None
        if len(v2018_ref01_data_raw) > 0:
            v2018_ref01_data = helpers.to_map(v2018_ref01_data_raw[0][1])

        # LOAD
        v2018_ref01_ent = client.V2018(None)
        v2018_ref01_match_dt0 = {
            "id": v2018_ref01_data["id"],
        }
        v2018_ref01_data_dt0_loaded, err = v2018_ref01_ent.load(v2018_ref01_match_dt0, None)
        assert err is None
        v2018_ref01_data_dt0_load_result = helpers.to_map(v2018_ref01_data_dt0_loaded)
        assert v2018_ref01_data_dt0_load_result is not None
        assert v2018_ref01_data_dt0_load_result["id"] == v2018_ref01_data["id"]



def _v2018_basic_setup(extra):
    runner.load_env_local()

    entity_data_file = os.path.join(_TEST_DIR, "../../.sdk/test/entity/v2018/V2018TestData.json")
    with open(entity_data_file, "r") as f:
        entity_data_source = f.read()

    entity_data = json.loads(entity_data_source)

    options = {}
    options["entity"] = entity_data.get("existing")

    client = AareguruSDK.test(options, extra)

    # Generate idmap via transform.
    idmap = vs.transform(
        ["v201801", "v201802", "v201803"],
        {
            "`$PACK`": ["", {
                "`$KEY`": "`$COPY`",
                "`$VAL`": ["`$FORMAT`", "upper", "`$COPY`"],
            }],
        }
    )

    env = runner.env_override({
        "AAREGURU_TEST_V_____ENTID": idmap,
        "AAREGURU_TEST_LIVE": "FALSE",
        "AAREGURU_TEST_EXPLAIN": "FALSE",
        "AAREGURU_APIKEY": "NONE",
    })

    idmap_resolved = helpers.to_map(
        env.get("AAREGURU_TEST_V_____ENTID"))
    if idmap_resolved is None:
        idmap_resolved = helpers.to_map(idmap)

    if env.get("AAREGURU_TEST_LIVE") == "TRUE":
        merged_opts = vs.merge([
            {
                "apikey": env.get("AAREGURU_APIKEY"),
            },
            extra or {},
        ])
        client = AareguruSDK(helpers.to_map(merged_opts))

    return {
        "client": client,
        "data": entity_data,
        "idmap": idmap_resolved,
        "env": env,
        "explain": env.get("AAREGURU_TEST_EXPLAIN") == "TRUE",
        "now": int(time.time() * 1000),
    }
