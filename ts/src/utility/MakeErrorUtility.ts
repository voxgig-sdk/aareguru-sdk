
import { Result, Context } from '../types'


import { clean } from './CleanUtility'

import { clone, delprop } from './StructUtility'


function makeError(ctx: Context, err?: any) {

  ctx = ctx || {}
  const op = ctx.op || {}
  op.name = op.name || 'unknown operation'


  const result = ctx.result || new Result({})
  result.ok = false

  const reserr = result.err

  err = undefined === err ? reserr : err
  err = err || ctx.error('unknown', 'unknown error')

  // A hook or fetcher may reject with a plain value; clean returns a masked
  // copy of that rather than changing it, so the copy is what leaves.
  if (!(err instanceof Error)) {
    const copy = clean(ctx, err)
    const text = 'string' === typeof copy ? copy : String(copy?.message ?? 'unknown error')
    err = Object.assign(new Error(text), 'object' === typeof copy ? copy : {})
  }

  const errmsg = err.message || 'unknown error'
  err.message = 'AareguruSDK: ' + op.name + ': ' + errmsg

  // Reachable for a debugger, invisible to a serialiser.
  if (null != err.ctx) {
    Object.defineProperty(err, 'ctx', { value: err.ctx, enumerable: false, writable: true })
  }

  clean(ctx, err)

  if (result.err) {
    delprop(result, 'err')
  }

  const spec = ctx.spec || {}

  if (ctx.ctrl.explain) {
    ctx.ctrl.explain.err = {
      ...clone({ err }).err,
      message: err.message,
      stack: err.stack,
    }
  }

  err.result = clean(ctx, result)
  err.spec = clean(ctx, spec)

  // So a consumer branches on `err.status`, not on the shape of `err.result`.
  err.status = null == result.status ? -1 : result.status

  ctx.ctrl.err = err

  // Closes error paths that never reach PreDone (e.g. an rbac short-circuit).
  if (null != ctx.client && null != ctx.utility &&
    'function' === typeof ctx.utility.featureHook) {
    ctx.utility.featureHook(ctx, 'PreUnexpected')
  }

  if (false === ctx.ctrl.throw) {
    return result.resdata
  }
  else {
    throw err
  }
}


export {
  makeError
}
