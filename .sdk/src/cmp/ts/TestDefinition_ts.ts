import { cmp, File, Content, definitionPlan } from '@voxgig/sdkgen'


// Every operation checked against the API definition, offline, in the SDK's
// own suite: see test/definition-runner.
const TestDefinition = cmp(function TestDefinition(props: any) {
  const plan = definitionPlan(props.ctx$)
  if (0 === plan.length) return

  File({ name: 'definition.test.ts' }, () => Content(`import { describe, test } from 'node:test'
import { SDK } from '..'
import { runDefinitionPoint } from './definition-runner'
import { isControlSkipped } from './utility'


// Generated from the API definition, not from the model this SDK was built
// from: the route, the declared query parameters, the credential the security
// scheme names, and the definition's own response example.
const PLAN: any[] = ${JSON.stringify(plan, null, 2)}


describe('definition', () => {
  for (const point of PLAN) {
    test(point.entity + '.' + point.op + ' ' + point.method + ' ' + point.path, async (t) => {
      const control = isControlSkipped('entityOp', point.entity + '.' + point.op, 'definition')
      if (control.skip) {
        t.skip(control.reason || 'skipped via sdk-test-control.json')
        return
      }
      await runDefinitionPoint(SDK, point)
    })
  }
})
`))
})


export {
  TestDefinition
}
