
import { cmp, Content, isAuthActive, envName, canonKey, canonScalarKey, entityIdField, opRequestShape, safeVarName, exampleVarName, serverVariables, listMatchArg, matchExampleItems, litString, entityOps } from '@voxgig/sdkgen'

import {
  KIT,
  getModelPath,
  nom,
} from '@voxgig/apidef'


// A type-correct, executable Python literal for a param: numeric/boolean/
// array/object params render a typed literal; strings render the quoted
// placeholder (the doc test EXECUTES this block, so a comment placeholder
// would break it).
function pyLit(type: any, placeholder: string = 'example'): string {
  const k = canonScalarKey(type)
  if ('NULL' === k) return 'None'
  if ('INTEGER' === k || 'NUMBER' === k) return '1'
  if ('BOOLEAN' === k) return 'True'
  if ('ARRAY' === k) return '[]'
  if ('OBJECT' === k) return '{}'
  return litString('py', placeholder)
}


const ReadmeTopQuick = cmp(function ReadmeTopQuick(props: any) {
  const { target, ctx$: { model } } = props

  const entity = getModelPath(model, `main.${KIT}.entity`)

  const exampleEntity = Object.values(entity).find((e: any) => e.active !== false) as any

  const authActive = isAuthActive(model)

  const svars = serverVariables(model)
  const pyServerField = 0 === svars.length ? '' :
    `\n    "server": {` +
    svars.map((v: any) => `\n        "${v.name}": "<${v.name}>",`).join('') +
    `\n    },`

  const apikeyImport = authActive ? `import os\n` : ''
  const ctor = authActive
    ? `${model.const.Name}SDK({\n    "apikey": os.environ.get("${envName(model)}_APIKEY"),${pyServerField}\n})`
    : ('' === pyServerField
      ? `${model.const.Name}SDK()`
      : `${model.const.Name}SDK({${pyServerField}\n})`)

  Content(`\`\`\`python
${apikeyImport}from ${model.const.Name.toLowerCase()}_sdk import ${model.const.Name}SDK

client = ${ctor}

`)

  if (exampleEntity) {
    const eName = nom(exampleEntity, 'Name')
    // Sanitise the local variable name — an entity whose lowercased name is a
    // Python keyword (e.g. `class`) would otherwise emit uncompilable code.
    const eVar = exampleVarName(eName.toLowerCase(), 'py')
    const opnames = entityOps(exampleEntity)
    const idF = entityIdField(exampleEntity)

    let hasCall = false

    if (opnames.includes('list')) {
      Content(`# List all ${eName.toLowerCase()}s (a list of entities, one per record; raises on error)
${eVar}s = client.${eName}().list(${listMatchArg('py', exampleEntity)})
for ${eVar} in ${eVar}s:
    print(${eVar}.data_get())
`)
      hasCall = true
    }

    if (opnames.includes('load')) {
      const loadItems = matchExampleItems(exampleEntity, 'load', idF)
        .sort((a: any, b: any) =>
          (a.name === idF ? 0 : 1) - (b.name === idF ? 0 : 1))
      const loadArg = 0 < loadItems.length
        ? `{${loadItems.map((it: any) =>
          `${litString('py', it.name)}: ${pyLit(it.type,
            it.name === idF ? 'example_id' : 'example_' + it.name)}`).join(', ')}}`
        : ''
      Content(`
# Load a specific ${eName.toLowerCase()} (returns the entity, raises on error)
${eVar} = client.${eName}().load(${loadArg})
print(${eVar}.data_get())
`)
      hasCall = true
    }
  }

  Content(`\`\`\`
`)

})


export {
  ReadmeTopQuick
}
