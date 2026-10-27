
import { Context } from '../types'

function prepareMethod(ctx: Context) {
  const op = ctx.op
  const opname = op.name

  let key = opname

  const methodMap: any = {
    create: 'POST',
    update: 'PUT',
    load: 'GET',
    list: 'GET',
    remove: 'DELETE',
    patch: 'PATCH',
  }

  // The API definition is authoritative: a POST-only or PATCH-based API
  // exposes `update` as POST or PATCH, not the PUT the op name implies.
  // Only fall back to the op-name convention when the point has no method.
  const method = ctx.point?.method

  if (null != method && '' !== method) {
    return method.toUpperCase()
  }

  return methodMap[key]
}


// Whether a comma-separated allow option names the item: whole names, any case.
function allowed(list: any, item: any): boolean {
  const want = 'string' === typeof item ? item.toUpperCase() : ''
  return '' !== want && 'string' === typeof list &&
    list.split(',').some((name: string) => name.trim().toUpperCase() === want)
}


export {
  allowed,
  prepareMethod
}
