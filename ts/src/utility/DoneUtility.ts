
import { Context } from '../types'


import { clean } from './CleanUtility'


function done(ctx: Context) {
  const error = ctx.utility.makeError

  cleanExplain(ctx)

  if (ctx.result && ctx.result.ok) {
    return ctx.result.resdata
  }

  return error(ctx)
}


// In place: the caller may hold the record, and a stream copies only its ctrl.
function cleanExplain(ctx: Context) {
  const explain = ctx.ctrl.explain
  if (null == explain || 'object' !== typeof explain) {
    return
  }
  const cleaned = clean(ctx, explain)
  if (cleaned !== explain) {
    for (const k of Object.keys(explain)) delete explain[k]
    Object.assign(explain, cleaned)
  }
  // With clean off, explain.result is the live result makeError reads.
  if (null != explain.result) explain.result = ctx.utility.struct.delprop({ ...explain.result }, 'err')
}


export {
  cleanExplain,
  done
}
