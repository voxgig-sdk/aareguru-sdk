import type { Feature, Context, FeatureOptions } from '../../types'




class BaseFeature implements Feature {
  version = '0.0.1'
  name = 'base'
  active = true


  init(_ctx: Context, _options: FeatureOptions): void | Promise<any> { }


  PostConstruct(this: any, _ctx: any) { }

  PostConstructEntity(this: any, _ctx: any) { }


  SetData(this: any, _ctx: any) { }

  GetData(this: any, _ctx: any) { }

  SetMatch(this: any, _ctx: any) { }

  GetMatch(this: any, _ctx: any) { }


  PrePoint(this: any, _ctx: any) { }

  PreSpec(this: any, _ctx: any) { }

  PreRequest(this: any, _ctx: any) { }

  PreResponse(this: any, _ctx: any) { }

  PreResult(this: any, _ctx: any) { }

  PreDone(this: any, _ctx: any) { }

  PreUnexpected(this: any, _ctx: any) { }


  // Settles as `wait` does unless the signal aborts first, which runs `stop`
  // and rejects with the signal's reason.
  _untilAbort(this: any, wait: Promise<any>, signal?: any, stop?: () => void): Promise<any> {
    if (null == signal) {
      return wait
    }
    return new Promise((resolve, reject) => {
      const abort = () => {
        if (null != stop) {
          stop()
        }
        reject(signal.reason)
      }
      if (signal.aborted) {
        return abort()
      }
      signal.addEventListener('abort', abort, { once: true })
      wait.then((value) => {
        signal.removeEventListener('abort', abort)
        resolve(value)
      }, (err) => {
        signal.removeEventListener('abort', abort)
        reject(err)
      })
    })
  }

}


export {
  BaseFeature
}
