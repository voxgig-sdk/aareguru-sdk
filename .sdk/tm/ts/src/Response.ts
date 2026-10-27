
import { getprop } from './utility/StructUtility'


class Response {
  status: number
  statusText: string
  headers: any
  json: Function
  err?: Error
  body?: any

  constructor(resmap: Record<string, any>) {
    this.status = getprop(resmap, 'status', -1)
    this.statusText = getprop(resmap, 'statusText', '')
    this.headers = getprop(resmap, 'headers')
    this.json = readJson(resmap)
    this.body = getprop(resmap, 'body')
    this.err = getprop(resmap, 'err')
  }
}


// An empty body, such as the one an accepted delete answers with, is no
// body: parsing it as JSON would throw after the call has succeeded.
function readJson(resmap: Record<string, any>): Function {
  if ('function' === typeof resmap.text) {
    return async () => {
      const text = await resmap.text()
      if ('' === text.trim()) {
        return undefined
      }
      try {
        return JSON.parse(text)
      }
      catch (err: any) {
        err.text = text
        throw err
      }
    }
  }
  return resmap.json ? resmap.json.bind(resmap) : async () => undefined
}


export {
  Response,
}
