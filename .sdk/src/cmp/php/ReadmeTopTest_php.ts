
import { cmp, Content, canonKey, canonScalarKey, entityIdField, pickExampleEntity, phpEntityAccessor, seededList, litPair, matchExampleItems, requestExampleItems } from '@voxgig/sdkgen'

import {
  KIT,
  getModelPath,
  nom,
} from '@voxgig/apidef'


// A type-correct PHP literal for a field's canonical type.
function phpLit(type: any): string {
  const k = canonScalarKey(type)
  if ('NULL' === k) return 'null'
  if ('INTEGER' === k || 'NUMBER' === k) return '1'
  if ('BOOLEAN' === k) return 'true'
  if ('ARRAY' === k || 'OBJECT' === k) return '[]'
  return '"example"'
}


const ReadmeTopTest = cmp(function ReadmeTopTest(props: any) {
  const { target, ctx$: { model } } = props

  const entity = getModelPath(model, `main.${KIT}.entity`)

  // Pick an entity with a real op (prefer a read op) — never fabricate a
  // `load` on an op-less entity like Cloudsmith's `Abort`.
  const { entity: exampleEntity, primaryOp } = pickExampleEntity(entity)

  if (exampleEntity && primaryOp) {
    const eName = nom(exampleEntity, 'Name')
    const ename = eName.toLowerCase()
    // Model-driven id key: null when the entity has no id-like field.
    const idF = entityIdField(exampleEntity)
    const isMatchOp = 'load' === primaryOp || 'remove' === primaryOp
    const listed = 'list' === primaryOp ? seededList('php', exampleEntity, idF, 'test01') : null
    const recPairs = listed ? listed.record : idF ? [litPair('php', idF, '"test01"')] : []
    const recBody = `[${recPairs.join(', ')}]`
    let callArg = ''
    if (listed) {
      callArg = 0 < listed.call.length ? `[${listed.call.join(', ')}]` : ''
    } else if (isMatchOp) {
      // Every REQUIRED match key (id first, then parent path params like
      // page_id) — the same shape the runtime resolves path params from.
      const items = matchExampleItems(exampleEntity, primaryOp, idF)
        .sort((a: any, b: any) =>
          (a.name === idF ? 0 : 1) - (b.name === idF ? 0 : 1))
      callArg = 0 < items.length
        ? `[${items.map((it: any) =>
          litPair('php', it.name, it.name === idF ? '"test01"' : phpLit(it.type))).join(', ')}]`
        : ''
    } else if ('create' === primaryOp || 'update' === primaryOp || 'patch' === primaryOp) {
      const items = requestExampleItems(exampleEntity, primaryOp)
        .filter((it: any) => it.name !== idF && it.name !== 'id')
      const required = items.filter((it: any) => !it.optional)
      const chosen = required.length ? required : items.slice(0, 3)
      callArg = `[${chosen.map((it: any) => litPair('php', it.name, phpLit(it.type))).join(', ')}]`
    }
    // A list result is an array — name the variable accordingly. The fixture
    // key is the model name, which the mock looks the entity up by.
    const eVar = ename + ('list' === primaryOp ? 's' : '')
    Content(`\`\`\`php
// Seed fixture data so offline calls resolve without a live server.
$client = ${model.const.Name}SDK::test([
    "entity" => ["${exampleEntity.name}" => ["test01" => ${recBody}]],
]);
$${eVar} = $client->${phpEntityAccessor(eName)}()->${primaryOp}(${callArg});
\`\`\`
`)
  } else {
    Content(`\`\`\`php
$client = ${model.const.Name}SDK::test();
\`\`\`
`)
  }

})


export {
  ReadmeTopTest
}
