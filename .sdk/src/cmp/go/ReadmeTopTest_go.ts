
import { cmp, Content } from '@voxgig/sdkgen'

import {
  KIT,
  getModelPath,
  nom,
} from '@voxgig/apidef'


const ReadmeTopTest = cmp(function ReadmeTopTest(props: any) {
  const { target, ctx$: { model } } = props

  const entity = getModelPath(model, `main.${KIT}.entity`)
  const orgPrefix = (model.origin || '').replace(/-sdk$/, '').replace(/[^a-z0-9]/gi, '')
  const gomodule = orgPrefix + model.name.replace(/[^a-z0-9]/gi, '').toLowerCase() + 'sdk'

  const exampleEntity = Object.values(entity).find((e: any) => e.active !== false) as any

  Content(`\`\`\`go
client := sdk.TestSDK(nil, nil)
`)

  if (exampleEntity) {
    const eName = nom(exampleEntity, 'Name')
    Content(`result, err := client.${eName}(nil).Load(
    map[string]any{"id": "test01"}, nil,
)
`)
  }

  Content(`\`\`\`
`)

})


export {
  ReadmeTopTest
}
