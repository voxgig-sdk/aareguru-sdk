
import { cmp, Content, canonKey, canonScalarKey, entityIdField, pickExampleEntity, goModule, requiredItems, litPair, matchExampleItems, requestExampleItems } from '@voxgig/sdkgen'

import {
  KIT,
  getModelPath,
  nom,
} from '@voxgig/apidef'


// A type-correct Go literal for a field's canonical type.
function goLit(type: any): string {
  const k = canonScalarKey(type)
  if ('NULL' === k) return 'nil'
  if ('INTEGER' === k || 'NUMBER' === k) return '1'
  if ('BOOLEAN' === k) return 'true'
  if ('ARRAY' === k) return '[]any{}'
  if ('OBJECT' === k) return 'map[string]any{}'
  return '"example"'
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}


const ReadmeTopTest = cmp(function ReadmeTopTest(props: any) {
  const { target, ctx$: { model } } = props

  const entity = getModelPath(model, `main.${KIT}.entity`)
  // Go module path == repo path on GitHub (org from model.origin).
  const gomodule = goModule(model, target.name)

  // Pick an entity with a real op (prefer a read op) — never fabricate a
  // `load` on an op-less entity like Cloudsmith's `Abort`.
  const { entity: exampleEntity, primaryOp } = pickExampleEntity(entity)

  Content(`\`\`\`go
client := sdk.Test()
`)

  if (exampleEntity && primaryOp) {
    const eName = nom(exampleEntity, 'Name')
    const idF = entityIdField(exampleEntity)
    const isMatchOp = 'load' === primaryOp || 'remove' === primaryOp
    let arg = 'nil'
    if (isMatchOp) {
      const items = matchExampleItems(exampleEntity, primaryOp, idF)
        .sort((a: any, b: any) => (a.name === idF ? 0 : 1) - (b.name === idF ? 0 : 1))
      arg = 0 < items.length
        ? `map[string]any{${items.map((it: any) => litPair('go', it.name, it.name === idF ? '"test01"' : goLit(it.type))).join(', ')}}`
        : 'nil'
    } else if ('list' === primaryOp && 0 < requiredItems(exampleEntity, 'list').length) {
      const chosen = requiredItems(exampleEntity, 'list')
      arg = `map[string]any{${chosen.map((it: any) => litPair('go', it.name, goLit(it.type))).join(', ')}}`
    } else if ('create' === primaryOp || 'update' === primaryOp || 'patch' === primaryOp) {
      const items = requestExampleItems(exampleEntity, primaryOp)
        .filter((it: any) => it.name !== idF && it.name !== 'id')
      const required = items.filter((it: any) => !it.optional)
      const chosen = required.length ? required : items.slice(0, 3)
      arg = `map[string]any{${chosen.map((it: any) => litPair('go', it.name, goLit(it.type))).join(', ')}}`
    }
    Content(`result, err := client.${eName}(nil).${cap(primaryOp)}(
    ${arg}, nil,
)
`)
  }

  Content(`\`\`\`
`)

})


export {
  ReadmeTopTest
}
