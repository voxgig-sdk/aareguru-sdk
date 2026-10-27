
import { cmp, each, Content, canonToType, entityIdField, entityOps, listMatchArg, matchExampleItems, litString, requestExampleItems } from '@voxgig/sdkgen'

import {
  KIT,
  getModelPath,
} from '@voxgig/apidef'

import { exampleValue, goVarName } from './utility_go'


// Operation method spelling differs between Go and other languages — Go
// uses PascalCase methods with explicit ctrl arg, others use lowercase
// methods with optional ctrl. The op descriptions are language-agnostic.
const OP_DESC: Record<string, { method: string, desc: string }> = {
  load:   { method: 'Load(match, ctrl)',   desc: 'Load a single entity by match criteria.' },
  list:   { method: 'List(match, ctrl)',   desc: 'List entities matching the criteria.' },
  create: { method: 'Create(data, ctrl)',  desc: 'Create a new entity with the given data.' },
  update: { method: 'Update(data, ctrl)',  desc: 'Update an existing entity.' },
  patch:  { method: 'Patch(data, ctrl)',   desc: 'Change part of an existing entity.' },
  remove: { method: 'Remove(match, ctrl)', desc: 'Remove the matching entity.' },
}


const ReadmeEntity = cmp(function ReadmeEntity(props: any) {
  const { target } = props
  const { model } = props.ctx$

  const entity = getModelPath(model, `main.${KIT}.entity`)

  const publishedEntities = each(entity)
    .filter((entity: any) => entity.active !== false)

  if (0 === publishedEntities.length) {
    return
  }

  Content(`

## Entities

`)

  publishedEntities.map((entity: any) => {
    const opnames = entityOps(entity)
    const fields = Object.values(entity.fields || {})
    const idF = entityIdField(entity)
    const eVar = goVarName(entity.name)

    Content(`
### ${entity.Name}

`)

    if (entity.short) {
      Content(`${entity.short}

`)
    }

    Content(`Create an instance: \`${eVar} := client.${entity.Name}(nil)\`

`)

    if (opnames.length > 0) {
      Content(`#### Operations

| Method | Description |
| --- | --- |
`)
      opnames.map((opname: string) => {
        const info = OP_DESC[opname]
        if (info) {
          Content(`| \`${info.method}\` | ${info.desc} |
`)
        }
      })

      Content(`
`)
    }

    if (fields.length > 0) {
      Content(`#### Fields

| Field | Type | Description |
| --- | --- | --- |
`)

      each(fields, (field: any) => {
        const desc = field.sh || ''
        Content(`| \`${field.n}\` | \`${canonToType(field.t, target.name)}\` | ${desc} |
`)
      })

      Content(`
`)
    }

    if (opnames.includes('load')) {
      // The id key plus every REQUIRED match key (parent path params like
      // page_id) — the same shape that generates the op's request match, so
      // the example always carries the keys the route needs.
      const loadItems = matchExampleItems(entity, 'load', idF)
        .sort((a: any, b: any) =>
          (a.name === idF ? 0 : 1) - (b.name === idF ? 0 : 1))
      const loadArg = 0 < loadItems.length
        ? `map[string]any{${loadItems.map((it: any) =>
          `${litString('go', it.name)}: ${exampleValue(entity, entity.op && entity.op.load, it.name,
            it.name === idF ? entity.name + '_id' : it.name)}`).join(', ')}}`
        : 'nil'
      Content(`#### Example: Load

\`\`\`go
${eVar}, err := client.${entity.Name}(nil).Load(${loadArg}, nil)
if err != nil {
    panic(err)
}
fmt.Println(${eVar}.(sdk.Entity).Data()) // the loaded entity's record
\`\`\`

`)
    }

    if (opnames.includes('list')) {
      Content(`#### Example: List

\`\`\`go
${eVar}s, err := client.${entity.Name}(nil).List(${listMatchArg('go', entity)}, nil)
if err != nil {
    panic(err)
}
// A []any of entities, one per record.
for _, item := range ${eVar}s.([]any) {
    fmt.Println(item.(sdk.Entity).Data())
}
\`\`\`

`)
    }

    if (opnames.includes('create')) {
      // Members come from the SAME shape that generates the op's request
      // data (every required member appears, including a required id), each
      // with a type-correct example VALUE via exampleValue — a
      // `"name": /* type */` comment is not a value and yields uncompilable
      // Go, so the example must carry a real literal.
      const createItems = requestExampleItems(entity, 'create')
        .filter((it: any) => !it.optional)
      Content(`#### Example: Create

\`\`\`go
result, err := client.${entity.Name}(nil).Create(map[string]any{
`)
      createItems.map((it: any) => {
        Content(`    ${litString('go', it.name)}: ${exampleValue(entity, entity.op && entity.op.create, it.name, 'example_' + it.name)},
`)
      })
      Content(`}, nil)
if err != nil {
    panic(err)
}
fmt.Println(result.(sdk.Entity).Data()) // the created entity's record
\`\`\`

`)
    }
  })
})


export {
  ReadmeEntity
}
