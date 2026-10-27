
import { cmp, each, Content, isAuthActive, entityIdField, listMatchArg, matchExampleItems, litPair, litFor } from '@voxgig/sdkgen'

import {
  KIT,
  getModelPath,
} from '@voxgig/apidef'


const ReadmeModel = cmp(function ReadmeModel(props: any) {
  const { target, ctx$: { model } } = props

  const entity = getModelPath(model, `main.${KIT}.entity`)
  const entityList = each(entity).filter((e: any) => e.active !== false)

  const opUnion = new Set<string>()
  entityList.forEach((e: any) => Object.keys(e.op || {})
    .forEach((o: string) => { if (e.op[o] && e.op[o].active !== false) opUnion.add(o) }))
  const opRowDefs: Record<string, string> = {
    load: '| `load` | `(reqmatch, ctrl) -> any, err` | Load a single entity by match criteria, and return it. |',
    list: '| `list` | `(reqmatch, ctrl) -> any, err` | List entities matching the criteria, one per record. |',
    create: '| `create` | `(reqdata, ctrl) -> any, err` | Create a new entity, and return it. |',
    update: '| `update` | `(reqdata, ctrl) -> any, err` | Update an existing entity, and return it. |',
    patch: '| `patch` | `(reqdata, ctrl) -> any, err` | Change part of an existing entity, and return it. |',
    remove: '| `remove` | `(reqmatch, ctrl) -> any, err` | Remove an entity, and return it marked as deleted. |',
  }
  const opRows = ['load', 'list', 'create', 'update', 'patch', 'remove']
    .filter((o) => opUnion.has(o)).map((o) => opRowDefs[o]).join('\n')

  const recordOps = ['load', 'create', 'update', 'patch', 'remove'].filter((o) => opUnion.has(o))
    .map((o) => '`' + o + '`')
  const resultRows: string[] = []
  if (recordOps.length) resultRows.push('| ' + recordOps.join(' / ') + ' | the entity, whose `data_get()` reads its record (a `table`) |')
  if (opUnion.has('list')) resultRows.push('| `list` | an array (`table`) of entities, one per record |')
  const resultShapeRows = resultRows.join('\n')

  // The Result-shape illustration calls `load`, so the example entity must
  // actually HAVE load — entityList[0] need not. api-tools' first entity is
  // Cryptography (create-only), so the generated README demonstrated
  // `client:Cryptography():load()` and the readme_examples test died with
  // "attempt to call a nil value (method 'load')".
  const exEnt: any =
    entityList.find((e: any) => (e.op || {}).load) || entityList[0] || {}
  const eName = exEnt.Name || 'Entity'
  const eLower = String(exEnt.name || 'entity').toLowerCase()
  const hasLoad = null != (exEnt.op || {}).load
  const idF = entityIdField(exEnt)
  const loadItems = hasLoad ? matchExampleItems(exEnt, 'load', idF)
    .sort((a: any, b: any) => (a.name === idF ? 0 : 1) - (b.name === idF ? 0 : 1)) : []
  const loadArg = 0 < loadItems.length ? `{ ${loadItems.map((it: any) =>
    litPair('lua', it.name, it.name === idF ? '"example_id"' : litFor('lua', it.type))).join(', ')} }` : ''

  const apikeyOptionRow = isAuthActive(model)
    ? '| `apikey` | `string` | API key for authentication. |\n'
    : ''

  Content(`### ${model.const.Name}SDK

\`\`\`lua
local sdk = require("${model.name}_sdk")
local client = sdk.new(options)
\`\`\`

Creates a new SDK client.

| Option | Type | Description |
| --- | --- | --- |
${apikeyOptionRow}| \`base\` | \`string\` | Base URL of the API server. |
| \`prefix\` | \`string\` | URL path prefix prepended to all requests. |
| \`suffix\` | \`string\` | URL path suffix appended to all requests. |
| \`feature\` | \`table\` | Feature activation flags. |
| \`extend\` | \`table\` | Additional Feature instances to load. |
| \`system\` | \`table\` | System overrides (e.g. custom \`fetch\` function). |

### test

\`\`\`lua
local client = sdk.test(testopts, sdkopts)
\`\`\`

Creates a test-mode client with mock transport. Both arguments may be \`nil\`.

### ${model.const.Name}SDK methods

| Method | Signature | Description |
| --- | --- | --- |
| \`options_map\` | \`() -> table\` | Deep copy of current SDK options. |
| \`get_utility\` | \`() -> Utility\` | Copy of the SDK utility object. |
| \`prepare\` | \`(fetchargs) -> table, err\` | Build an HTTP request definition without sending. |
| \`direct\` | \`(fetchargs) -> table, err\` | Build and send an HTTP request. |
`)

  each(entityList, (ent: any) => {
    const article = /^[aeiou]/i.test(ent.Name) ? 'an' : 'a'
    Content(`| \`${ent.Name}\` | \`(data) -> ${ent.Name}Entity\` | Create ${article} ${ent.Name} entity instance. |
`)
  })

  Content(`
### Entity interface

All entities share the same interface.

| Method | Signature | Description |
| --- | --- | --- |
${opRows}
| \`data_get\` | \`() -> table\` | Get entity data. |
| \`data_set\` | \`(data)\` | Set entity data. |
| \`match_get\` | \`() -> table\` | Get entity match criteria. |
| \`match_set\` | \`(match)\` | Set entity match criteria. |
| \`make\` | \`() -> Entity\` | Create a new instance with the same options. |
| \`get_name\` | \`() -> string\` | Return the entity name. |

### Result shape

Entity operations return \`(value, err)\`. The \`value\` is the entity
itself — there is no wrapper:

| Operation | \`value\` |
| --- | --- |
${resultShapeRows}

Check \`err\` first (it is non-\`nil\` on failure), then use \`value\`:

    local ${eLower}, err = client:${eName}():${hasLoad ? 'load' : 'list'}(${
      hasLoad ? loadArg : listMatchArg('lua', exEnt)})
    if err then error(err) end
    -- ${eLower} is ${hasLoad ? 'the loaded entity' : 'an array of entities, one per record'}

Only \`direct()\` returns a response envelope — a \`table\` with \`ok\`,
\`status\`, \`headers\`, and \`data\` keys.

`)

  Content(`### Entities

`)
  each(entityList, (ent: any) => {
    const fields = Object.values(ent.fields || {})
    const opnames = Object.keys(ent.op || {})
    const ops = ent.op || {}
    const points = each(ops).map((op: any) =>
      op.points ? each(op.points) : []
    ).flat()
    const path = points.length > 0 ? (points[0] as any).o || '' : ''

    Content(`#### ${ent.Name}

| Field | Description |
| --- | --- |
`)
    each(fields, (field: any) => {
      Content(`| \`${field.n}\` | ${field.sh || ''} |
`)
    })

    Content(`
Operations: ${opnames.map((n: string) => n.charAt(0).toUpperCase() + n.slice(1)).join(', ')}.

API path: \`${path}\`

`)
  })

})


export {
  ReadmeModel
}
