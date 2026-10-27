
import { cmp, each, Content, isAuthActive, isHttpBasicAuth, packageName, envName, serverVariables, opRequestShape, entityIdField, entityDataIdField, entityOps, safeVarName, exampleVarName, jsKey, listMatchArg, matchExampleItems, requiredItems, jsProp, requestExampleItems, sendsId } from '@voxgig/sdkgen'

import {
  KIT,
  getModelPath,
  nom,
} from '@voxgig/apidef'

import { exampleValue } from './utility_ts'


const ReadmeQuick = cmp(function ReadmeQuick(props: any) {
  const { target, ctx$: { model } } = props

  const entity = getModelPath(model, `main.${KIT}.entity`)

  const exampleEntity = Object.values(entity).find((e: any) => e.active !== false) as any

  const nestedEntity = Object.values(entity).find((e: any) =>
    e.active !== false &&
    e.relations && e.relations.ancestors && 0 < e.relations.ancestors.length &&
    entityOps(e).includes('load') &&
    opRequestShape(e, 'load').items.some((it: any) =>
      !it.optional && it.name !== entityIdField(e))
  ) as any

  // Server variables (a templated server URL) are REQUIRED at construction
  // — makeOptions refuses rather than request a URL with a literal
  // `{account_id}` in it — so a quickstart that omits them is a quickstart
  // that throws on its first line.
  const svarLines = serverVariables(model)
    .map((v: any) => `\n    ${v.name}: '<${v.name}>',`).join('')
  const serverField = '' === svarLines ? '' :
    `\n  // Required: this API's server URL is templated on these.\n  server: {${svarLines}\n  },`

  const ctorFields = (isAuthActive(model)
    ? `\n  apikey: process.env.${envName(model)}_APIKEY,${
      isHttpBasicAuth(model) ? `\n  secret: process.env.${envName(model)}_SECRET,` : ''}`
    : '') + serverField

  const ctor = '' === ctorFields
    ? `new ${model.const.Name}SDK()`
    : `new ${model.const.Name}SDK({${ctorFields}\n})`

  Content(`### 1. Create a client

\`\`\`ts
import { ${model.const.Name}SDK } from '${packageName(model, target.name)}'

const client = ${ctor}
\`\`\`

`)


  if (exampleEntity) {
    const eName = nom(exampleEntity, 'Name')
    const eVar = exampleVarName(eName.toLowerCase(), 'ts')
    const article = /^[aeiou]/i.test(eName) ? 'an' : 'a'
    const opnames = entityOps(exampleEntity)
    const idF = entityIdField(exampleEntity)
    // The id field on the RETURNED record's data type, or null. DISTINCT from
    // idF (the match key): an entity can key its load-match on an id it does not
    // carry as a data field, so `.id` off a returned record must be guarded on
    // this — reading `created.id` when the data type has no id is a TS2339.
    const dataIdF = entityDataIdField(exampleEntity)

    if (opnames.includes('list')) {
      Content(`### 2. List ${eName.toLowerCase()} records

\`list()\` resolves to an array of ${eName} ENTITIES — every operation
resolves to entities, not raw records. Iterate them directly, and call
\`.data()\` on one for the record it holds:

\`\`\`ts
const ${eVar}s = await client.${eName}().list(${listMatchArg('ts', exampleEntity)})

for (const ${eVar} of ${eVar}s) {
  console.log(${eVar}.data())
}
\`\`\`

`)
    }

    if (nestedEntity) {
      const neName = nom(nestedEntity, 'Name')
      const neVar = exampleVarName(neName.toLowerCase(), 'ts')
      const neArticle = /^[aeiou]/i.test(neName) ? 'an' : 'a'
      const loadOp = nestedEntity.op && nestedEntity.op.load

      const neIdF = entityIdField(nestedEntity)
      const neRequired = requiredItems(nestedEntity, 'load')
        .sort((a: any, b: any) =>
          (a.name === neIdF ? 1 : 0) - (b.name === neIdF ? 1 : 0))
      const parentItem = neRequired.find((it: any) => it.name !== neIdF) as any
      const parentParam = parentItem && parentItem.name
      const parentName = parentParam ? parentParam.replace(/_id$/, '') : 'its parent'
      const neMatchLines = neRequired.map((it: any) =>
        `    ${jsKey(it.name)}: ${exampleValue(nestedEntity, loadOp, it.name,
          it.name === neIdF ? 'example_id' : 'example_' + it.name)},`)

      Content(`### 3. Load ${neArticle} ${neName.toLowerCase()}

${neName} is nested under ${parentName}, so provide the \`${parentParam}\`.
\`load()\` returns the entity and throws on failure; \`.data()\` reads its record:

\`\`\`ts
try {
  const ${neVar} = await client.${neName}().load({
${neMatchLines.join('\n')}
  })
  console.log(${neVar}.data())
} catch (err) {
  console.error('load failed:', err)
}
\`\`\`

`)
    }
    else if (opnames.includes('load')) {
      const loadRequired = matchExampleItems(exampleEntity, 'load', idF)
        .sort((a: any, b: any) =>
          (a.name === idF ? 0 : 1) - (b.name === idF ? 0 : 1))
      const loadArg = 0 < loadRequired.length
        ? `{ ${loadRequired.map((it: any) =>
          `${jsKey(it.name)}: ${exampleValue(exampleEntity, exampleEntity.op && exampleEntity.op.load, it.name,
            it.name === idF ? 'example_id' : 'example_' + it.name)}`).join(', ')} }`
        : ''

      Content(`### 3. Load ${article} ${eName.toLowerCase()}

\`load()\` returns the entity and throws on failure; \`.data()\` reads its record:

\`\`\`ts
try {
  const ${eVar} = await client.${eName}().load(${loadArg})
  console.log(${eVar}.data())
} catch (err) {
  console.error('load failed:', err)
}
\`\`\`

`)
    }

    // CRUD operations. The create/update example payloads are derived from the
    // SAME op shapes that generate the <Name>CreateData / <Name>UpdateData types
    // (opRequestShape), so the snippet always type-checks. Prefer writable
    // non-id fields and render a type-correct literal per field via
    // exampleValue — never a hardcoded field the entity may not have.
    if (opnames.includes('create') || opnames.includes('update') || opnames.includes('patch') ||
      opnames.includes('remove')) {
      const exampleFields = (opname: string): string[] => {
        const items = requestExampleItems(exampleEntity, opname)
          .filter((it: any) => (it.name !== idF && it.name !== 'id') ||
            ('create' === opname && !it.optional))
        const required = items.filter((it: any) => !it.optional)
        const optional = items.filter((it: any) => it.optional)
        const chosen = 'create' === opname
          ? (required.length ? required : items.slice(0, 2))
          : required.concat(optional).slice(0, Math.max(2, required.length))
        return chosen.map((it: any) =>
          `  ${jsKey(it.name)}: ${exampleValue(exampleEntity, exampleEntity.op[opname], it.name, 'example_' + it.name)},`)
      }

      const dataFields: any[] = exampleEntity.fields ? each(exampleEntity.fields) : []

      // A model field spells its type `t`; `type` is the older model shape.
      const dataIdField: any = dataIdF
        ? dataFields.find((f: any) => f && f.n === dataIdF)
        : null
      const dataIdType = dataIdField ? (dataIdField.t ?? dataIdField.type) : null

      // An unknown type is not evidence of compatibility: chain only on a
      // known match, since the literal example type-checks by construction.
      const usesCreatedId = (opname: string): boolean => {
        if (null == dataIdF || !opnames.includes('create')) {
          return false
        }
        const matchItem = opRequestShape(exampleEntity, opname).items
          .find((it: any) => it.name === idF)
        // OpShapeItem spells it `type`; only the raw model field uses `t`.
        const matchType = matchItem ? matchItem.type : null
        return null != matchType && null != dataIdType && matchType === dataIdType
      }
      const idValueFor = (opname: string): string => usesCreatedId(opname)
        ? `${jsProp('created.data()', dataIdF as string)}!`
        : exampleValue(exampleEntity, exampleEntity.op[opname], idF as string, 'example_id')

      Content(`### 4. Create, update, and remove

\`\`\`ts
`)
      if (opnames.includes('create')) {
        const createLines = exampleFields('create')
        const createBody = createLines.length ? '\n' + createLines.join('\n') + '\n' : ''
        Content(`// Create — returns the created ${eName} ENTITY (.data() for the record)
const created = await client.${eName}().create({${createBody}})

`)
      }
      if (opnames.includes('update')) {
        const updateLines = (sendsId(exampleEntity, 'update', idF) ? [`  ${jsKey(idF)}: ${idValueFor('update')},`] : []).concat(exampleFields('update'))
        const updateBody = updateLines.length ? '\n' + updateLines.join('\n') + '\n' : ''
        Content(`// Update${usesCreatedId('update') ? ' — the id comes off the returned entity\'s data()' : ''}
const updated = await client.${eName}().update({${updateBody}})

`)
      }
      if (opnames.includes('patch')) {
        const patchLines = (sendsId(exampleEntity, 'patch', idF) ? [`  ${jsKey(idF)}: ${idValueFor('patch')},`] : []).concat(exampleFields('patch'))
        const patchBody = patchLines.length ? '\n' + patchLines.join('\n') + '\n' : ''
        Content(`// Patch — sends only the fields given${usesCreatedId('patch') ? '; the id comes off the returned entity\'s data()' : ''}
const patched = await client.${eName}().patch({${patchBody}})

`)
      }
      if (opnames.includes('remove')) {
        const removeLines = matchExampleItems(exampleEntity, 'remove', idF)
          .sort((a: any, b: any) =>
            (a.name === idF ? 0 : 1) - (b.name === idF ? 0 : 1))
          .map((it: any) => it.name === idF
            ? `  ${jsKey(it.name)}: ${idValueFor('remove')},`
            : `  ${jsKey(it.name)}: ${exampleValue(exampleEntity, exampleEntity.op.remove, it.name, 'example_' + it.name)},`)
        Content(`// Remove
await client.${eName}().remove(${removeLines.length ? `{\n${removeLines.join('\n')}\n}` : ''})
`)
      }
      Content(`\`\`\`

`)
    }
  }

})


export {
  ReadmeQuick
}
