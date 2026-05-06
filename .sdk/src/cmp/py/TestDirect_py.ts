
import {
  depluralize,
} from '@voxgig/apidef'

import {
  Content,
  File,
  cmp,
  snakify,
} from '@voxgig/sdkgen'


function normalizePathParams(
  parts: string[],
  params: any[],
  rename?: Record<string, string>
): string {
  return parts.map((part: string) => {
    return part.replace(/\{([^}]+)\}/g, (match: string, rawName: string) => {
      const snaked = snakify(rawName)
      const depluralized = depluralize(snaked)
      // Prefer exact name match — orig matches can collide when one param's
      // original name was renamed to another param's current name (e.g. badge
      // load: param 'group_id' has orig 'id', and another param has name 'id').
      const param = params.find((p: any) =>
          p.name === snaked || p.name === depluralized) ||
        params.find((p: any) =>
          p.orig === snaked || p.orig === depluralized)
      if (param) return '{' + param.name + '}'

      if (rename) {
        for (const [origCamel, renamedTo] of Object.entries(rename)) {
          if (renamedTo === rawName) {
            const origSnaked = snakify(origCamel)
            const origDepluralized = depluralize(origSnaked)
            const renamedParam = params.find(
              (p: any) => p.orig === origSnaked || p.name === origSnaked ||
                p.orig === origDepluralized || p.name === origDepluralized
            )
            if (renamedParam) return '{' + renamedParam.name + '}'
          }
        }
      }

      return match
    })
  }).join('/')
}


const TestDirect = cmp(function TestDirect(props: any) {
  const ctx$ = props.ctx$
  const model = ctx$.model

  const target = props.target
  const entity = props.entity

  const PROJECTNAME = model.Name.toUpperCase().replace(/[^A-Z_]/g, '_')

  const opnames = Object.keys(entity.op)
  const hasLoad = opnames.includes('load')
  const hasList = opnames.includes('list')

  if (!hasLoad && !hasList) {
    return
  }

  const loadOp = entity.op.load
  const listOp = entity.op.list

  const loadPoint = loadOp?.points?.[0]
  const loadPath = loadPoint ? normalizePathParams(loadPoint.parts || [], loadPoint?.args?.params || [], loadPoint?.rename?.param) : ''
  const loadParams = loadPoint?.args?.params || []

  const listPoint = listOp?.points?.[0]
  const listPath = listPoint ? normalizePathParams(listPoint.parts || [], listPoint?.args?.params || [], listPoint?.rename?.param) : ''
  const listParams = listPoint?.args?.params || []

  const entidEnvVar = `${PROJECTNAME}_TEST_${entity.Name.toUpperCase().replace(/[^A-Z_]/g, '_')}_ENTID`

  File({ name: 'test_' + entity.name + '_direct.' + target.ext }, () => {

    Content(`# ${entity.Name} direct test

import json
import pytest

from utility.voxgig_struct import voxgig_struct as vs
from ${model.const.Name.toLowerCase()}_sdk import ${model.const.Name}SDK
from core import helpers
from test import runner


class Test${entity.Name}Direct:

`)

    if (hasList && listPoint) {
      Content(`    def test_should_direct_list_${entity.name}(self):
        setup = _${entity.name}_direct_setup([
            {"id": "direct01"},
            {"id": "direct02"},
        ])
        client = setup["client"]

`)

      if (listParams.length > 0) {
        Content(`        params = {}
`)
        for (const lp of listParams) {
          const key = lp.name === 'id'
            ? entity.name + '01'
            : lp.name.replace(/_id$/, '') + '01'
          Content(`        if setup["live"]:
            params["${lp.name}"] = setup["idmap"]["${key}"]
        else:
            params["${lp.name}"] = "direct01"
`)
        }
        Content(`
        result, err = client.direct({
            "path": "${listPath}",
            "method": "GET",
            "params": params,
        })
`)
      } else {
        Content(`
        result, err = client.direct({
            "path": "${listPath}",
            "method": "GET",
            "params": {},
        })
`)
      }

      Content(`        assert err is None
        assert result["ok"] is True
        assert helpers.to_int(result["status"]) == 200

        if not setup["live"]:
            assert isinstance(result["data"], list)
            assert len(result["data"]) == 2
            assert len(setup["calls"]) == 1

`)
    }

    if (hasLoad && loadPoint) {
      Content(`    def test_should_direct_load_${entity.name}(self):
        setup = _${entity.name}_direct_setup({"id": "direct01"})
        client = setup["client"]

`)

      if (loadParams.length > 0) {
        Content(`        params = {}
        if not setup["live"]:
`)
        for (let i = 0; i < loadParams.length; i++) {
          Content(`            params["${loadParams[i].name}"] = "direct0${i + 1}"
`)
        }
      }

      Content(`
        result, err = client.direct({
            "path": "${loadPath}",
            "method": "GET",
`)
      if (loadParams.length > 0) {
        Content(`            "params": params,
`)
      } else {
        Content(`            "params": {},
`)
      }
      Content(`        })
        assert err is None
        assert result["ok"] is True
        assert helpers.to_int(result["status"]) == 200
        assert result["data"] is not None

        if not setup["live"]:
            if isinstance(result["data"], dict):
                assert result["data"]["id"] == "direct01"
            assert len(setup["calls"]) == 1

`)
    }

    Content(`

def _${entity.name}_direct_setup(mockres):
    runner.load_env_local()

    calls = []

    env = runner.env_override({
        "${entidEnvVar}": {},
        "${PROJECTNAME}_TEST_LIVE": "FALSE",
        "${PROJECTNAME}_APIKEY": "NONE",
    })

    live = env.get("${PROJECTNAME}_TEST_LIVE") == "TRUE"

    if live:
        merged_opts = {
            "apikey": env.get("${PROJECTNAME}_APIKEY"),
        }
        client = ${model.const.Name}SDK(merged_opts)
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

    client = ${model.const.Name}SDK({
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
`)
  })
})


export {
  TestDirect
}
