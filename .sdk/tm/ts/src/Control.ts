
import { getprop } from './utility/StructUtility'


class Control {
  throw?: boolean
  err?: any
  explain?: any
  // Cancels the request in flight, which ts and js alone do so far.
  signal?: AbortSignal

  constructor(ctrlmap: Record<string, any>) {
    this.throw = getprop(ctrlmap, 'throw')
    this.err = getprop(ctrlmap, 'err')
    this.explain = getprop(ctrlmap, 'explain')
    this.signal = getprop(ctrlmap, 'signal')
  }
}


export {
  Control,
}
