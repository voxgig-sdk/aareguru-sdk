# Legacy entity test

import json
import os
import time

import pytest

from utility.voxgig_struct import voxgig_struct as vs
from aareguru_sdk import AareguruSDK
from core import helpers

_TEST_DIR = os.path.dirname(os.path.abspath(__file__))
from test import runner


class TestLegacyEntity:

    def test_should_create_instance(self):
        testsdk = AareguruSDK.test(None, None)
        ent = testsdk.Legacy(None)
        assert ent is not None

    def test_should_run_basic_flow(self):
        setup = _legacy_basic_setup(None)
        client = setup["client"]

        # Bootstrap entity data from existing test data.
        legacy_ref01_data_raw = vs.items(helpers.to_map(
            vs.getpath(setup["data"], "existing.legacy")))
        legacy_ref01_data = None
        if len(legacy_ref01_data_raw) > 0:
            legacy_ref01_data = helpers.to_map(legacy_ref01_data_raw[0][1])

        # LOAD
        legacy_ref01_ent = client.Legacy(None)
        legacy_ref01_match_dt0 = {
            "id": legacy_ref01_data["id"],
        }
        legacy_ref01_data_dt0_loaded, err = legacy_ref01_ent.load(legacy_ref01_match_dt0, None)
        assert err is None
        legacy_ref01_data_dt0_load_result = helpers.to_map(legacy_ref01_data_dt0_loaded)
        assert legacy_ref01_data_dt0_load_result is not None
        assert legacy_ref01_data_dt0_load_result["id"] == legacy_ref01_data["id"]



def _legacy_basic_setup(extra):
    runner.load_env_local()

    entity_data_file = os.path.join(_TEST_DIR, "../../.sdk/test/entity/legacy/LegacyTestData.json")
    with open(entity_data_file, "r") as f:
        entity_data_source = f.read()

    entity_data = json.loads(entity_data_source)

    options = {}
    options["entity"] = entity_data.get("existing")

    client = AareguruSDK.test(options, extra)

    # Generate idmap via transform.
    idmap = vs.transform(
        ["legacy01", "legacy02", "legacy03"],
        {
            "`$PACK`": ["", {
                "`$KEY`": "`$COPY`",
                "`$VAL`": ["`$FORMAT`", "upper", "`$COPY`"],
            }],
        }
    )

    env = runner.env_override({
        "AAREGURU_TEST_LEGACY_ENTID": idmap,
        "AAREGURU_TEST_LIVE": "FALSE",
        "AAREGURU_TEST_EXPLAIN": "FALSE",
        "AAREGURU_APIKEY": "NONE",
    })

    idmap_resolved = helpers.to_map(
        env.get("AAREGURU_TEST_LEGACY_ENTID"))
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
