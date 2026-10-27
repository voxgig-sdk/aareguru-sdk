
import { Context } from '../types'

import { callArgs } from './ParamUtility'


function prepareQuery(ctx: Context) {
  const utility = ctx.utility
  const struct = utility.struct
  const items = struct.items

  const point = ctx.point
  let params = point.params
  let reqmatch = ctx.reqmatch

  params = params || []
  reqmatch = reqmatch || {}

  // A path parameter travels in the path. The generated config lists them as
  // args.params, which prepareParams reads; params is the older list of names.
  const inpath: string[] = params.concat(
    (point.args?.params || []).map((p: any) => p?.name))

  // A query parameter travels under the name the definition gives it, its
  // orig, which the model may have renamed for the caller.
  const wire: Record<string, string> = Object.create(null)
  const declared: string[] = []
  for (const q of (point.args?.query || [])) {
    if ('string' === typeof q?.name) {
      declared.push(q.name)
      if ('string' === typeof q?.orig && '' !== q.orig) {
        wire[q.name] = q.orig
      }
    }
  }

  // A header or cookie parameter travels in the headers, which prepareHeaders
  // fills, unless a query parameter shares its name: then both are sent.
  const elsewhere: string[] = (point.args?.header || []).concat(point.args?.cookie || [])
    .map((a: any) => a?.name).filter((name: string) => !declared.includes(name))

  const out: any = {}
  for (let [key, val] of items(reqmatch)) {
    if (null != val && '$action' !== key && !inpath.includes(key) && !elsewhere.includes(key)) {
      out[wire[key] ?? key] = val
    }
  }

  // A create or update passes its query arguments in its data.
  for (const arg of callArgs(ctx, 'query')) {
    if (null != arg.val && !inpath.includes(arg.name)) {
      out[arg.wire] = arg.val
    }
  }

  return out
}


export {
  prepareQuery
}
