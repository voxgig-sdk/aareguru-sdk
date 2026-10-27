
import { Context } from '../types'

import { callArgs } from './ParamUtility'

function transformRequest(ctx: Context) {
  const spec = ctx.spec
  const utility = ctx.utility
  const point = ctx.point
  const isfunc = utility.struct.isfunc
  const transform = utility.struct.transform

  if (spec) {
    spec.step = 'reqform'
  }

  try {
    const reqform = point.transform.req
    const reqdata = isfunc(reqform) ? reqform(ctx) : transform({
      reqdata: omit(ctx.reqdata, routedArgNames(ctx))
    }, reqform)

    return stripAction(reqdata)
  }
  catch (err) {
    return utility.makeError(ctx, err)
  }
}




function stripAction(reqdata: any) {
  return omit(reqdata, ['$action'])
}


// A header, cookie or query argument travels where prepareHeaders or
// prepareQuery sends it, so the body is built from the request data without
// it, unless the point marks it as a field the body keeps.
function routedArgNames(ctx: Context): string[] {
  return [...callArgs(ctx, 'header'), ...callArgs(ctx, 'cookie'), ...callArgs(ctx, 'query')]
    .map((arg) => arg.name)
    .filter((name) => !fieldArg(ctx, name))
}


function fieldArg(ctx: Context, name: string): boolean {
  return ['header', 'cookie', 'query'].some((kind) =>
    (ctx.point?.args?.[kind] || []).some((arg: any) => name === arg?.name && true === arg?.field))
}


function omit(reqdata: any, names: string[]) {
  if (null == reqdata || 'object' !== typeof reqdata || Array.isArray(reqdata)) {
    return reqdata
  }

  if (!names.some((name) => Object.prototype.hasOwnProperty.call(reqdata, name))) {
    return reqdata
  }

  const body: Record<string, any> = {}
  for (const key of Object.keys(reqdata)) {
    if (names.includes(key)) {
      continue
    }
    if ('__proto__' === key) {
      Object.defineProperty(body, key, {
        value: reqdata[key],
        enumerable: true,
        writable: true,
        configurable: true,
      })
    }
    else {
      body[key] = reqdata[key]
    }
  }

  return body
}

export {
  transformRequest
}
