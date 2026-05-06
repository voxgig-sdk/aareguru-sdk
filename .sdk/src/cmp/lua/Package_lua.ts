
import {
  Content,
  File,
  cmp,
  collectDeps,
} from '@voxgig/sdkgen'


import type {
  Model,
} from '@voxgig/apidef'


const Package = cmp(async function Package(props: any) {
  const ctx$ = props.ctx$
  const target = props.target

  const model: Model = ctx$.model

  File({ name: model.name + '.rockspec' }, () => {
    Content(`package = "${model.name}-sdk"
version = "0.0-1"
source = {
  url = "git://github.com/voxgig/${model.name}-sdk.git"
}
description = {
  summary = "${model.const.Name} SDK for Lua",
  license = "MIT"
}
dependencies = {
  "lua >= 5.3",
  "dkjson >= 2.5",
`)

    for (const d of collectDeps(model, target.name, target.deps)) {
      const v = d.source === 'target' ? (d.version || '0.0') : d.version
      Content(`  "${d.name} >= ${v}",
`)
    }

    Content(`}
build = {
  type = "builtin",
  modules = {
    ["${model.name}_sdk"] = "${model.name}_sdk.lua",
    ["config"] = "config.lua",
    ["features"] = "features.lua",
  }
}
`)
  })
})


export {
  Package
}
