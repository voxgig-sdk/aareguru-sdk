
import { cmp, Content, isAuthActive, envName, canonKey, canonScalarKey, entityIdField, opRequestShape, safeVarName, exampleVarName, matchExampleItems, litString, entityOps } from '@voxgig/sdkgen'

import {
  KIT,
  getModelPath,
  nom,
} from '@voxgig/apidef'

import { rbListArgs } from './utility_rb'


// A type-correct, executable Ruby literal for a param: numeric/boolean/
// array/hash params render a typed literal; strings render the quoted
// placeholder (the doc test EXECUTES this block, so a comment placeholder
// would break it).
function rbLit(type: any, placeholder: string = 'example'): string {
  const k = canonScalarKey(type)
  if ('NULL' === k) return 'nil'
  if ('INTEGER' === k || 'NUMBER' === k) return '1'
  if ('BOOLEAN' === k) return 'true'
  if ('ARRAY' === k) return '[]'
  if ('OBJECT' === k) return '{}'
  return litString('rb', placeholder)
}


const ReadmeTopQuick = cmp(function ReadmeTopQuick(props: any) {
  const { target, ctx$: { model } } = props

  const entity = getModelPath(model, `main.${KIT}.entity`)

  const exampleEntity = Object.values(entity).find((e: any) => e.active !== false) as any

  const authActive = isAuthActive(model)
  const ctor = authActive
    ? `${model.const.Name}SDK.new({\n  "apikey" => ENV["${envName(model)}_APIKEY"],\n})`
    : `${model.const.Name}SDK.new`

  Content(`\`\`\`ruby
require_relative "${model.const.Name}_sdk"

client = ${ctor}

`)

  if (exampleEntity) {
    const eName = nom(exampleEntity, 'Name')
    // Sanitise the local variable name — an entity whose lowercased name is a
    // Ruby keyword (e.g. `self`) would otherwise emit uncompilable code.
    const eVar = exampleVarName(eName.toLowerCase(), 'rb')
    const opnames = entityOps(exampleEntity)
    const idF = entityIdField(exampleEntity)

    let hasCall = false

    if (opnames.includes('list')) {
      Content(`# List all ${eName.toLowerCase()}s (an Array of entities, one per record; raises on error)
${eVar}s = client.${eName}.list${rbListArgs(exampleEntity)}
${eVar}s.each { |item| puts item.data_get }
`)
      hasCall = true
    }

    if (opnames.includes('load')) {
      const loadItems = matchExampleItems(exampleEntity, 'load', idF)
        .sort((a: any, b: any) =>
          (a.name === idF ? 0 : 1) - (b.name === idF ? 0 : 1))
      const loadArg = 0 < loadItems.length
        ? `{ ${loadItems.map((it: any) =>
          `${litString('rb', it.name)} => ${rbLit(it.type,
            it.name === idF ? 'example_id' : 'example_' + it.name)}`).join(', ')} }`
        : ''
      Content(`
# Load a specific ${eName.toLowerCase()} (returns the entity; data_get reads its record; raises on error)
${eVar} = client.${eName}.load(${loadArg})
puts ${eVar}.data_get
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
