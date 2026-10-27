
import { cmp, Content, isAuthActive, isHttpBasicAuth, packageName, envName, entityIdField, entityOps, opRequestShape, safeVarName, exampleVarName, jsKey, serverVariables, listMatchArg, matchExampleItems } from '@voxgig/sdkgen'

import {
  KIT,
  getModelPath,
  nom,
} from '@voxgig/apidef'

import { exampleValue } from './utility_ts'


const ReadmeTopQuick = cmp(function ReadmeTopQuick(props: any) {
  const { target, ctx$: { model } } = props

  const entity = getModelPath(model, `main.${KIT}.entity`)
  const exampleEntity = Object.values(entity).find((e: any) => e.active !== false) as any

  const authActive = isAuthActive(model)

  // Server variables (a templated server URL) are REQUIRED at construction
  // - makeOptions refuses rather than request a URL with a literal
  // {account_id} in it - so a quickstart that omits them is a quickstart
  // that throws on its first line.
  const svarLines = serverVariables(model)
    .map((v: any) => `\n    ${v.name}: '<${v.name}>',`).join('')
  const serverField = '' === svarLines ? '' :
    `\n  // Required: this API's server URL is templated on these.\n  server: {${svarLines}\n  },`

  const ctorFields = (authActive
    ? `\n  apikey: process.env.${envName(model)}_APIKEY,${
      isHttpBasicAuth(model) ? `\n  secret: process.env.${envName(model)}_SECRET,` : ''}`
    : '') + serverField

  const ctor = '' === ctorFields
    ? `new ${model.const.Name}SDK()`
    : `new ${model.const.Name}SDK({${ctorFields}\n})`

  Content(`\`\`\`ts
import { ${model.const.Name}SDK } from '${packageName(model, target.name)}'

const client = ${ctor}

`)

  if (exampleEntity) {
    const eName = nom(exampleEntity, 'Name')
    const eVar = exampleVarName(eName.toLowerCase(), 'ts')
    const opnames = entityOps(exampleEntity)

    let hasCall = false

    if (opnames.includes('list')) {
      Content(`// List all ${eName.toLowerCase()}s (returns ${eName}Entity[], one entity per record)
const ${eVar}s = await client.${eName}().list(${listMatchArg('ts', exampleEntity)})
for (const ${eVar} of ${eVar}s) {
  console.log(${eVar}.data())
}
`)
      hasCall = true
    }

    // Find a nested entity for a more interesting example: one with a parent
    // chain, an active load op of its OWN, and a required non-id load param
    // to demonstrate (the parent key, e.g. page_id).
    const nestedEntity = Object.values(entity).find((e: any) =>
      e.active !== false &&
      e.relations && e.relations.ancestors && 0 < e.relations.ancestors.length &&
      entityOps(e).includes('load') &&
      opRequestShape(e, 'load').items.some((it: any) =>
        !it.optional && it.name !== entityIdField(e))
    ) as any

    if (nestedEntity) {
      const neName = nom(nestedEntity, 'Name')
      const neVar = exampleVarName(neName.toLowerCase(), 'ts')
      const loadOp = nestedEntity.op && nestedEntity.op.load

      const neIdF = entityIdField(nestedEntity)
      const neMatchLines = matchExampleItems(nestedEntity, 'load', neIdF)
        .sort((a: any, b: any) =>
          (a.name === neIdF ? 1 : 0) - (b.name === neIdF ? 1 : 0))
        .map((it: any) =>
          `  ${jsKey(it.name)}: ${exampleValue(nestedEntity, loadOp, it.name,
            it.name === neIdF ? 'example_id' : 'example_' + it.name)},`)

      Content(`
// Load a specific ${neName.toLowerCase()} (returns the entity, ${/^[aeiou]/i.test(neName) ? 'an' : 'a'} ${neName}Entity)
const ${neVar} = await client.${neName}().load({
${neMatchLines.join('\n')}
})
console.log(${neVar}.data())
`)
      hasCall = true
    }

    if (!hasCall && opnames.includes('load')) {
      // The id and every required parameter: a load without them has no route.
      const idF = entityIdField(exampleEntity)
      const loadItems = matchExampleItems(exampleEntity, 'load', idF)
        .sort((a: any, b: any) =>
          (a.name === idF ? 1 : 0) - (b.name === idF ? 1 : 0))
        .map((it: any) =>
          `  ${jsKey(it.name)}: ${exampleValue(exampleEntity, exampleEntity.op && exampleEntity.op.load, it.name,
            it.name === idF ? 'example_id' : 'example_' + it.name)},`)
      const loadArg = 0 < loadItems.length ? `{\n${loadItems.join('\n')}\n}` : ''
      Content(`// Load a specific ${eName.toLowerCase()} (returns the entity, ${/^[aeiou]/i.test(eName) ? 'an' : 'a'} ${eName}Entity)
const ${eVar} = await client.${eName}().load(${loadArg})
console.log(${eVar}.data())
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
