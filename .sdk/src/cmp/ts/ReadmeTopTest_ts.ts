
import { cmp, Content, entityIdField, pickExampleEntity, requiredItems, safeVarName, exampleVarName, jsKey, matchExampleItems, requestExampleItems } from '@voxgig/sdkgen'

import {
  KIT,
  getModelPath,
  nom,
} from '@voxgig/apidef'

import { exampleValue } from './utility_ts'


const ReadmeTopTest = cmp(function ReadmeTopTest(props: any) {
  const { target, ctx$: { model } } = props

  const entity = getModelPath(model, `main.${KIT}.entity`)
  // Pick an entity with a real op (prefer a read op) — never fabricate a
  // `load` on an op-less entity like Cloudsmith's `Abort`.
  const { entity: exampleEntity, primaryOp } = pickExampleEntity(entity)

  const seedEntity = exampleEntity ? nom(exampleEntity, 'name') : ''
  const seedFields = exampleEntity ?
    requestExampleItems(exampleEntity, 'create')
      .filter((it: any) => !it.optional)
      .slice(0, 3) : []

  const seedId = 'test01'
  const idF = exampleEntity ? entityIdField(exampleEntity) : null
  const isIdField = (it: any) => it.name === idF || it.name === 'id'

  // A list matches its required parameters against the record, so the seed
  // carries the values the call below sends, and an id is the record's key.
  const listItems = 'list' === primaryOp ? requiredItems(exampleEntity, 'list') : []
  const listed = (it: any) => listItems.some((li: any) => li.name === it.name)
  const listLit = (it: any): string => exampleValue(exampleEntity, exampleEntity.op.list,
    it.name, isIdField(it) ? seedId : 'example_' + it.name)

  const seedBody = [
    `${jsKey('id')}: '${seedId}'`,
    ...[...seedFields, ...listItems.filter((it: any) =>
      !seedFields.some((sf: any) => sf.name === it.name))]
      .filter((it: any) => 'id' !== it.name)
      .map((it: any) => `${jsKey(it.name)}: ${listed(it) ? listLit(it) : exampleValue(
        exampleEntity, exampleEntity.op && exampleEntity.op.create, it.name,
        'example_' + it.name)}`),
  ].join(', ')

  Content(`\`\`\`ts
// The offline mock starts EMPTY — seed it with the records the test needs.
// Shape: { entity: { <entity-name>: { <id>: <record> } } }
const client = ${model.const.Name}SDK.test({
  entity: {
    ${seedEntity}: {
      ${seedId}: { ${seedBody} },
    },
  },
})
`)

  if (exampleEntity && primaryOp) {
    const eName = nom(exampleEntity, 'Name')
    // A list() result is an array — name the variable accordingly.
    const eVar = exampleVarName(eName.toLowerCase(), 'ts') +
      ('list' === primaryOp ? 's' : '')
    const primaryOpDef = exampleEntity.op && exampleEntity.op[primaryOp]
    let arg = ''
    const isMatchOp = 'load' === primaryOp || 'remove' === primaryOp
    if (isMatchOp || 'list' === primaryOp) {
      // Every REQUIRED match key (id first) — the same shape that generates
      // the op's Match type, so the block type-checks.
      const items = (isMatchOp ? matchExampleItems(exampleEntity, primaryOp, idF) : [...listItems])
        .sort((a: any, b: any) =>
          (a.name === idF ? 0 : 1) - (b.name === idF ? 0 : 1))
      const lit = (it: any): string => isMatchOp
        ? exampleValue(exampleEntity, primaryOpDef, it.name,
          it.name === idF ? 'test01' : 'example_' + it.name)
        : listLit(it)
      arg = 0 < items.length
        ? `{ ${items.map((it: any) => `${jsKey(it.name)}: ${lit(it)}`).join(', ')} }`
        : ''
    } else if ('create' === primaryOp || 'update' === primaryOp || 'patch' === primaryOp) {
      const items = requestExampleItems(exampleEntity, primaryOp)
        .filter((it: any) => !isIdField(it) || !it.optional)
      const required = items.filter((it: any) => !it.optional)
      const chosen = required.length ? required : items.slice(0, 3)
      arg = `{ ${chosen.map((it: any) =>
        // A required id matches the record seeded into the mock above, so the
        // example reads as one coherent story rather than two.
        `${jsKey(it.name)}: ${exampleValue(exampleEntity, primaryOpDef, it.name,
          isIdField(it) ? seedId : 'example_' + it.name)}`).join(', ')} }`
    }
    const one = exampleVarName(eName.toLowerCase(), 'ts')
    Content(`const ${eVar} = await client.${eName}().${primaryOp}(${arg})
${'list' === primaryOp
    ? `// ${eVar} is an array of ${eName} entities, one per mock record
console.log(${eVar}.map((${one}) => ${one}.data()))`
    : `// ${eVar} is the ${eName} entity; .data() reads its mock record
console.log(${eVar}.data())`}
`)
  }

  Content(`\`\`\`
`)

})


export {
  ReadmeTopTest
}
