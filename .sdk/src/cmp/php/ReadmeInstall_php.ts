
import { cmp, Content, installCommand, isPublished, packageName, repoInfo } from '@voxgig/sdkgen'


const ReadmeInstall = cmp(function ReadmeInstall(props: any) {
  const { target, ctx$ } = props
  const { model } = ctx$

  if (isPublished(model, target.name)) {
    Content(`\`\`\`bash
${installCommand(model, target.name)}
\`\`\`

`)
    return
  }

  // Publish pending: not yet on Packagist. Install from the git release tag,
  // or from a clone as a Composer path repository, since a tag may not exist.
  const { releasesUrl, repoUrl, repo } = repoInfo(model)
  Content(`This package is not yet published to Packagist. Install it from the
GitHub release tag (\`${target.name}/vX.Y.Z\`, see [Releases](${releasesUrl})), or
from a clone as a Composer path repository:

\`\`\`bash
git clone ${repoUrl}
composer config repositories.${repo} path ./${repo}/${target.name}
composer require ${packageName(model, target.name)}:@dev
\`\`\`

`)
})


export {
  ReadmeInstall
}
