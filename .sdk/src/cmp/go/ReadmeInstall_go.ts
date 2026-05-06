
import { cmp, Content } from '@voxgig/sdkgen'


const ReadmeInstall = cmp(function ReadmeInstall(props: any) {
  const { target, ctx$ } = props
  const { model } = ctx$

  const orgPrefix = (model.origin || '').replace(/-sdk$/, '').replace(/[^a-z0-9]/gi, '')
  const gomodule = orgPrefix + model.name.replace(/[^a-z0-9]/gi, '').toLowerCase() + 'sdk'

  Content(`\`\`\`bash
go get ${gomodule}
\`\`\`

If the module is not yet published to a registry, use a \`replace\` directive
in your \`go.mod\` to point to a local checkout:

\`\`\`bash
go mod edit -replace ${gomodule}=../path/to/${gomodule}
\`\`\`

`)
})


export {
  ReadmeInstall
}
