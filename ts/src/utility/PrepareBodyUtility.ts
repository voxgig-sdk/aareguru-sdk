
import { Context } from '../types'

import { isRawRequest, rawBody } from './MediaUtility'

function prepareBody(ctx: Context) {
  const op = ctx.op

  const utility = ctx.utility
  const error = utility.makeError
  const transformRequest = utility.transformRequest

  let body = undefined

  if ('data' === op.input) {
    if (isRawRequest(ctx.point)) {
      return rawBody(ctx.reqdata)
    }

    try {
      body = transformRequest(ctx)

    }
    catch (err) {
      return error(ctx, err)
    }
  }

  return body
}

export {
  prepareBody
}

