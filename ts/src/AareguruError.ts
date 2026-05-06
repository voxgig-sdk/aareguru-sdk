
import { Context } from './Context'


class AareguruError extends Error {

  isAareguruError = true

  sdk = 'Aareguru'

  code: string
  ctx: Context

  constructor(code: string, msg: string, ctx: Context) {
    super(msg)
    this.code = code
    this.ctx = ctx
  }

}

export {
  AareguruError
}

