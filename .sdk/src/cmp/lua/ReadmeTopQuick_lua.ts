
import { cmp, Content, isAuthActive, envName, canonKey, canonScalarKey, entityIdField, opRequestShape, safeVarName, exampleVarName, luaKey, listMatchArg, matchExampleItems, litString, entityOps } from '@voxgig/sdkgen'

import {
  KIT,
  getModelPath,
  nom,
} from '@voxgig/apidef'


// A type-correct, executable Lua literal for a param: numeric/boolean/table
// params render a typed literal; strings render the quoted placeholder (the
// doc test EXECUTES this block, so a comment placeholder would break it).
function luaLit(type: any, placeholder: string = 'example'): string {
  const k = canonScalarKey(type)
  if ('NULL' === k) return 'nil'
  if ('INTEGER' === k || 'NUMBER' === k) return '1'
  if ('BOOLEAN' === k) return 'true'
  if ('ARRAY' === k || 'OBJECT' === k) return '{}'
  return litString('lua', placeholder)
}



const ReadmeTopQuick = cmp(function ReadmeTopQuick(props: any) {
  const { target, ctx$: { model } } = props

  const entity = getModelPath(model, `main.${KIT}.entity`)

  const exampleEntity = Object.values(entity).find((e: any) => e.active !== false) as any

  const authActive = isAuthActive(model)
  const ctor = authActive
    ? `sdk.new({\n  apikey = os.getenv("${envName(model)}_APIKEY"),\n})`
    : `sdk.new()`

  const shown = null != exampleEntity &&
    ['list', 'load'].some((op: string) => entityOps(exampleEntity).includes(op))

  Content(`\`\`\`lua
local sdk = require("${model.name}_sdk")
${shown ? 'local json = require("dkjson")\n' : ''}
local client = ${ctor}

`)

  if (exampleEntity) {
    const eName = nom(exampleEntity, 'Name')
    // Sanitise the local variable name — an entity whose lowercased name is a
    // Lua keyword (e.g. `end`) would otherwise emit uncompilable code.
    const eVar = exampleVarName(eName.toLowerCase(), 'lua')
    const opnames = entityOps(exampleEntity)
    const idF = entityIdField(exampleEntity)

    let hasCall = false

    if (opnames.includes('list')) {
      Content(`-- List all ${eName.toLowerCase()}s (an array of entities, one per record; err on failure)
local ${eVar}s, err = client:${eName}():list(${listMatchArg('lua', exampleEntity)})
if err then error(err) end
for _, ${eVar} in ipairs(${eVar}s) do
  print(json.encode(${eVar}:data_get()))
end
`)
      hasCall = true
    }

    if (opnames.includes('load')) {
      // Every REQUIRED load-match key (id first, then parent path params like
      // page_id) — the same shape the runtime resolves path params from, so
      // the example always works.
      const loadItems = matchExampleItems(exampleEntity, 'load', idF)
        .sort((a: any, b: any) =>
          (a.name === idF ? 0 : 1) - (b.name === idF ? 0 : 1))
      const loadArg = 0 < loadItems.length
        ? `{ ${loadItems.map((it: any) =>
          `${luaKey(it.name)} = ${luaLit(it.type,
            it.name === idF ? 'example_id' : 'example_' + it.name)}`).join(', ')} }`
        : ''
      Content(`
-- Load a specific ${eName.toLowerCase()} (returns the entity; err on failure)
local ${eVar}, err = client:${eName}():load(${loadArg})
if err then error(err) end
print(json.encode(${eVar}:data_get()))
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
