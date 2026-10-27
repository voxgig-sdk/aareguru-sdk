
import { Context, Response, Result } from '../types'

import { isStream, readStream } from './MediaUtility'


async function makeRequest(ctx: Context): Promise<Response | Error> {
  // PreRequest feature hook has already provided a result.
  if (ctx.out.request) {
    return ctx.out.request
  }

  const spec = ctx.spec
  const utility = ctx.utility
  const fetcher = utility.fetcher
  const makeFetchDef = utility.makeFetchDef

  let response = new Response({})

  let result = new Result({})

  ctx.result = result

  if (null == spec) {
    return ctx.error('request_no_spec', 'Expected context spec property to be defined.')
  }


  try {
    const fetchdef = makeFetchDef(ctx)
    if (fetchdef instanceof Error) {
      throw fetchdef
    }

    if (true === fetchdef.signal?.aborted) {
      throw fetchdef.signal.reason
    }

    // A stream can be read once; read it now, so that a retry sends the same bytes.
    if (isStream(fetchdef.body)) {
      fetchdef.body = await readStream(fetchdef.body)
      delete fetchdef.duplex
    }

    if (ctx.ctrl.explain) {
      ctx.ctrl.explain.fetchdef = fetchdef
    }

    spec.step = 'prerequest'

    const fetched = await fetcher(ctx, fetchdef.url, fetchdef)

    if (null == fetched) {
      response = new Response({ err: ctx.error('request_no_response', 'response: undefined') })
    }
    else if (fetched instanceof Error) {
      response = new Response({ err: abortError(ctx, fetched) })
    }
    else {
      response = new Response(fetched)
    }
  }
  catch (err) {
    response.err = abortError(ctx, err)
  }

  spec.step = 'postrequest'

  ctx.response = response

  return response
}


// A request that failed once its signal aborted failed because of it, whatever
// the transport rejected with.
function abortError(ctx: Context, err: any): any {
  const signal = ctx.ctrl?.signal
  if (true !== signal?.aborted) {
    return err
  }
  const abort = ctx.error('request_aborted', 'request aborted')
  // Not enumerable, as a native cause is: the reason is the caller's own value.
  Object.defineProperty(abort, 'cause', { value: signal.reason, writable: true, configurable: true })
  return abort
}


export {
  abortError,
  makeRequest
}
