
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

  File({ name: entity.name + '_direct_test.' + target.ext }, () => {

    Content(`-- ${entity.Name} direct test

local json = require("dkjson")
local vs = require("utility.struct.struct")
local sdk = require("${model.name}_sdk")
local helpers = require("core.helpers")
local runner = require("test.runner")

describe("${entity.Name}Direct", function()
`)

    if (hasList && listPoint) {
      Content(`  it("should direct-list-${entity.name}", function()
    local setup = ${entity.name}_direct_setup({
      { id = "direct01" },
      { id = "direct02" },
    })
    local client = setup.client

`)

      if (listParams.length > 0) {
        Content(`    local params = {}
`)
        for (const lp of listParams) {
          const key = lp.name === 'id'
            ? entity.name + '01'
            : lp.name.replace(/_id$/, '') + '01'
          Content(`    if setup.live then
      params["${lp.name}"] = setup.idmap["${key}"]
    else
      params["${lp.name}"] = "direct01"
    end
`)
        }
        Content(`
    local result, err = client:direct({
      path = "${listPath}",
      method = "GET",
      params = params,
    })
`)
      } else {
        Content(`
    local result, err = client:direct({
      path = "${listPath}",
      method = "GET",
      params = {},
    })
`)
      }

      Content(`    assert.is_nil(err)
    assert.is_true(result["ok"])
    assert.are.equal(200, helpers.to_int(result["status"]))

    if not setup.live then
      assert.is_table(result["data"])
      assert.are.equal(2, #result["data"])
      assert.are.equal(1, #setup.calls)
    end
  end)

`)
    }

    if (hasLoad && loadPoint) {
      Content(`  it("should direct-load-${entity.name}", function()
    local setup = ${entity.name}_direct_setup({ id = "direct01" })
    local client = setup.client

`)

      if (loadParams.length > 0) {
        Content(`    local params = {}
    if not setup.live then
`)
        for (let i = 0; i < loadParams.length; i++) {
          Content(`      params["${loadParams[i].name}"] = "direct0${i + 1}"
`)
        }
        Content(`    end
`)
      }

      Content(`
    local result, err = client:direct({
      path = "${loadPath}",
      method = "GET",
`)
      if (loadParams.length > 0) {
        Content(`      params = params,
`)
      } else {
        Content(`      params = {},
`)
      }
      Content(`    })
    assert.is_nil(err)
    assert.is_true(result["ok"])
    assert.are.equal(200, helpers.to_int(result["status"]))
    assert.is_not_nil(result["data"])

    if not setup.live then
      if type(result["data"]) == "table" then
        assert.are.equal("direct01", result["data"]["id"])
      end
      assert.are.equal(1, #setup.calls)
    end
  end)

`)
    }

    Content(`end)


function ${entity.name}_direct_setup(mockres)
  runner.load_env_local()

  local calls = {}

  local env = runner.env_override({
    ["${entidEnvVar}"] = {},
    ["${PROJECTNAME}_TEST_LIVE"] = "FALSE",
    ["${PROJECTNAME}_APIKEY"] = "NONE",
  })

  local live = env["${PROJECTNAME}_TEST_LIVE"] == "TRUE"

  if live then
    local merged_opts = {
      apikey = env["${PROJECTNAME}_APIKEY"],
    }
    local client = sdk.new(merged_opts)
    return {
      client = client,
      calls = calls,
      live = true,
      idmap = {},
    }
  end

  local function mock_fetch(url, init)
    table.insert(calls, { url = url, init = init })
    return {
      status = 200,
      statusText = "OK",
      headers = {},
      json = function()
        if mockres ~= nil then
          return mockres
        end
        return { id = "direct01" }
      end,
      body = "mock",
    }, nil
  end

  local client = sdk.new({
    base = "http://localhost:8080",
    system = {
      fetch = mock_fetch,
    },
  })

  return {
    client = client,
    calls = calls,
    live = false,
    idmap = {},
  }
end
`)
  })
})


export {
  TestDirect
}
