
import { cmp, Content, installCommand, isPublished, repoInfo } from '@voxgig/sdkgen'


const ReadmeInstall = cmp(function ReadmeInstall(props: any) {
  const { target, ctx$ } = props
  const { model } = ctx$

  if (isPublished(model, target.name)) {
    Content('```bash')
    Content(`
${installCommand(model, target.name)}
`)
    Content('```')
    return
  }

  // Publish pending: the package is not yet on npm, so install from the
  // git release tag instead of a `npm install` that would 404. A repository
  // may have no tag at all, and npm cannot install a subdirectory of a git
  // URL, so a clone is always offered too. It carries the compiled dist/.
  const { hostName, tagsUrl, repoUrl, repo } = repoInfo(model)
  Content(`This package is not yet published to npm. Install it from the ${hostName}
release tag (\`${target.name}/vX.Y.Z\`, see [Tags](${tagsUrl})), or from a
clone, which carries the compiled \`dist/\`:

\`\`\`bash
git clone ${repoUrl}
npm install ./${repo}/${target.name}
\`\`\`

`)
})


export {
  ReadmeInstall
}
