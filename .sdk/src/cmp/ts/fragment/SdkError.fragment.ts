
import { Context } from './Context'


class ProjectNameError extends Error {

  isProjectNameError = true

  sdk = 'ProjectName'

  code: string
  ctx!: Context

  status: number = -1

  result?: any
  spec?: any


  // `err.notFound` rather than a magic number at every call site.
  get notFound(): boolean { return 404 === this.status }

  constructor(code: string, msg: string, ctx: Context) {
    super(msg)
    this.code = code
    // Reachable for a debugger, invisible to a serialiser: the context holds
    // the live spec and options, and an error is what gets logged.
    Object.defineProperty(this, 'ctx', { value: ctx, enumerable: false, writable: true })
  }

  // What makeError attached is already cleaned; the context is not part of
  // the record.
  toJSON() {
    return {
      sdk: this.sdk,
      code: this.code,
      message: this.message,
      status: this.status,
      result: this.result,
      spec: this.spec,
    }
  }

}

export {
  ProjectNameError
}

