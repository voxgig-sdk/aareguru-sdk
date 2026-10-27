
import { cmp, Content, canonKey, canonScalarKey, entityIdField, pickExampleEntity, luaKey, requiredItems, matchExampleItems, requestExampleItems } from '@voxgig/sdkgen'

import {
  KIT,
  getModelPath,
  nom,
} from '@voxgig/apidef'


// A type-correct Lua literal for a field's canonical type.
function luaLit(type: any): string {
  const k = canonScalarKey(type)
  if ('NULL' === k) return 'nil'
  if ('INTEGER' === k || 'NUMBER' === k) return '1'
  if ('BOOLEAN' === k) return 'true'
  if ('ARRAY' === k || 'OBJECT' === k) return '{}'
  return '"example"'
}


const ReadmeTopTest = cmp(function ReadmeTopTest(props: any) {
  const { target, ctx$: { model } } = props

  const entity = getModelPath(model, `main.${KIT}.entity`)

  // Pick an entity with a real op (prefer a read op) — never fabricate a
  // `load` on an op-less entity like Cloudsmith's `Abort`.
  const { entity: exampleEntity, primaryOp } = pickExampleEntity(entity)

  Content(`\`\`\`lua
local client = sdk.test()
`)

  if (exampleEntity && primaryOp) {
    const eName = nom(exampleEntity, 'Name')
    const idF = entityIdField(exampleEntity)
    const isMatchOp = 'load' === primaryOp || 'remove' === primaryOp
    let arg = ''
    if (isMatchOp || ('list' === primaryOp && 0 < requiredItems(exampleEntity, 'list').length)) {
      // Every REQUIRED match key (id first, then parent path params like
      // page_id) — the same shape the runtime resolves path params from.
      const items = (isMatchOp ? matchExampleItems(exampleEntity, primaryOp, idF) : requiredItems(exampleEntity, 'list'))
        .sort((a: any, b: any) =>
          (a.name === idF ? 0 : 1) - (b.name === idF ? 0 : 1))
      arg = 0 < items.length
        ? `{ ${items.map((it: any) =>
          `${luaKey(it.name)} = ${isMatchOp && it.name === idF ? '"test01"' : luaLit(it.type)}`).join(', ')} }`
        : ''
    } else if ('create' === primaryOp || 'update' === primaryOp || 'patch' === primaryOp) {
      const items = requestExampleItems(exampleEntity, primaryOp)
        .filter((it: any) => it.name !== idF && it.name !== 'id')
      const required = items.filter((it: any) => !it.optional)
      const chosen = required.length ? required : items.slice(0, 3)
      arg = `{ ${chosen.map((it: any) => `${luaKey(it.name)} = ${luaLit(it.type)}`).join(', ')} }`
    }
    // A list result is an array — name the variable accordingly.
    const rVar = 'list' === primaryOp ? 'results' : 'result'
    Content(`local ${rVar}, err = client:${eName}():${primaryOp}(${arg})
`)
  }

  Content(`\`\`\`
`)

})


export {
  ReadmeTopTest
}
