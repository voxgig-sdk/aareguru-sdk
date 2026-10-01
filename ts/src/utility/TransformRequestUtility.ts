
import { Context } from '../types'

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
      reqdata: omit(ctx.reqdata, headerArgNames(ctx))
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


// A header argument travels as a header, which prepareHeaders sends, so the
// body is built from the request data without it.
function headerArgNames(ctx: Context): string[] {
  return (ctx.point?.args?.header || []).map((h: any) => h?.name)
    .filter((name: any) => 'string' === typeof name && '' !== name)
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
