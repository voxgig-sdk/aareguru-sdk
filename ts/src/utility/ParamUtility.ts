
import { Context } from '../types'

function param(ctx: Context, paramdef: any) {
  const point = ctx.point
  const spec = ctx.spec

  const utility = ctx.utility
  const struct = utility.struct

  const getprop = struct.getprop
  const setprop = struct.setprop

  const typify = struct.typify
  const T_string = struct.T_string

  const pt = typify(paramdef)


  const key = 0 < (T_string & pt) ? paramdef : getprop(paramdef, 'name')

  const akey = getprop(point.alias, key)

  if (null != spec && null != akey &&
    null == getprop(ctx.reqmatch, key) && null == getprop(ctx.match, key)) {
    setprop(spec.alias, akey, key)
  }

  return paramValue(ctx, point, key)
}


// The value the call or its entity gives a point's parameter, under its name
// or the point's alias for it.
function paramValue(ctx: Context, point: any, key: string): any {
  const getprop = ctx.utility.struct.getprop
  const akey = getprop(point?.alias, key)

  let val = getprop(ctx.reqmatch, key)

  if (null == val) {
    val = getprop(ctx.match, key)
  }

  if (null == val && null != akey) {
    val = getprop(ctx.reqmatch, akey)
  }

  if (null == val) {
    val = getprop(ctx.reqdata, key)
  }

  if (null == val) {
    val = getprop(ctx.data, key)
  }

  if (null == val && null != akey) {
    val = getprop(ctx.reqdata, akey)

    if (null == val) {
      val = getprop(ctx.data, akey)
    }
  }

  return val
}


type CallArg = { name: string, wire: string, val: any }


// The arguments a point declares in one location, query or header, each with
// the name it travels under and the value this call passes in its match or
// else its data. Unlike a path parameter, the entity's stored match and data
// never supply one.
function callArgs(ctx: Context, kind: string): CallArg[] {
  const getprop = ctx.utility.struct.getprop
  const out: CallArg[] = []

  for (const arg of (ctx.point?.args?.[kind] || [])) {
    if ('string' !== typeof arg?.name || '' === arg.name) continue
    out.push({
      name: arg.name,
      wire: String(arg.orig || arg.name),
      val: getprop(ctx.reqmatch, arg.name) ?? getprop(ctx.reqdata, arg.name),
    })
  }

  return out
}


export {
  param,
  paramValue,
  callArgs,
}

