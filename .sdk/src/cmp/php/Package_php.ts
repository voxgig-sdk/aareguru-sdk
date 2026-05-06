
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

  // Generate composer.json
  File({ name: 'composer.json' }, () => {
    Content(`{
  "name": "voxgig/${model.name}-sdk",
  "description": "${model.const.Name} SDK for PHP",
  "type": "library",
  "license": "MIT",
  "minimum-stability": "stable",
  "require": {
    "php": ">=8.2"`)

    for (const d of collectDeps(model, target.name, target.deps)) {
      const v = d.source === 'target' ? (d.version || '0.0') : d.version
      Content(`,
    "${d.name}": "^${v}"`)
    }

    Content(`
  },
  "require-dev": {
    "phpunit/phpunit": "^11.0"
  },
  "autoload": {
    "psr-4": {
      "${model.const.Name}\\\\": "src/"
    }
  },
  "autoload-dev": {
    "psr-4": {
      "${model.const.Name}\\\\Tests\\\\": "test/"
    }
  }
}
`)
  })
})


export {
  Package
}
