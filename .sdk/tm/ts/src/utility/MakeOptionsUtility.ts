
import { Context } from '../types'
import { OPTSPEC } from '../Schema'

import { clean, cleanAdd, cleanAddSensitive, makeCleanConfig, splitvalues } from './CleanUtility'


function makeOptions(ctx: Context) {
  const utility = ctx.utility
  const options = ctx.options
  const struct = utility.struct
  const items = struct.items
  const setprop = struct.setprop
  const merge = struct.merge
  const validate = struct.validate

  let opts = { ...(options || {}) }

  const authSuppressed = null === (options || {}).auth

  let config = ctx.config || {}
  let cfgopts = config.options || {}

  // The registry exists BEFORE validation, so rejecting a mistyped credential
  // is clean too. An absent block is left out, or merge would erase the defaults.
  const layer = (b: any) => null != b && 'object' === typeof b && !Array.isArray(b) ? b : {}
  const cleancfg = makeCleanConfig(merge([{}, (OPTSPEC as any).clean,
    struct.clone(layer(cfgopts.clean)), layer(opts.clean)]))
  const cleanctx: any = { options: { __derived__: { clean: cleancfg } } }
  cleanAddSensitive(cleanctx, settings(opts))
  for (const raw of [...splitvalues(cfgopts.clean?.values), ...splitvalues(opts.clean?.values)]) {
    cleanAdd(cleanctx, raw)
  }

  let featureorder: string[] = []
  if (Array.isArray(opts.feature)) {
    const fmap: any = {}
    for (const entry of opts.feature) {
      if (null != entry && null != entry.name) {
        const { name, ...fopts } = entry
        fmap[name] = fopts
        featureorder.push(name)
      }
    }
    opts = { ...opts, feature: fmap }
  }

  const customUtils = opts.utility || {}
  for (let [key, val] of items(customUtils)) {
    setprop(utility, key, val)
  }

  const optspec = OPTSPEC

  // Clone the config side before merging: `config` is a module-level
  // singleton in ts/js, and merge would otherwise use its nested maps as
  // merge TARGETS — one instance's options (server, headers, ...) would
  // contaminate every instance constructed after it.
  opts = merge([{}, struct.clone(cfgopts), opts])

  try {
    opts = validate(opts, optspec)
  }
  catch (err: any) {
    throw clean(cleanctx, err)
  }

  opts.system = opts.system || {}
  if (null == opts.system.fetch) {
    opts.system.fetch = global.fetch
  }

  // Restore the suppression the optspec default would otherwise erase.
  if (authSuppressed) {
    opts.auth = null
  }

  if ('string' === typeof opts.base && opts.base.includes('{')) {
    const testmode = true === opts.test.active ||
      true === (opts.feature && opts.feature.test && opts.feature.test.active)
    const server = opts.server || {}
    opts.base = opts.base.replace(/\{([A-Za-z0-9_]+)\}/g,
      (_m: string, name: string) => {
        let val = server[name]
        val = 'string' === typeof val ? val : ''
        if ('' === val) {
          if (testmode) {
            return 'test-' + name
          }
          throw new Error(
            `${config?.main?.name || 'SDK'}: the server variable '${name}' is required: ` +
            `the API base URL is '${opts.base}' — pass { server: { ${name}: '...' } } ` +
            `in the SDK options`)
        }
        return val
      })
  }

  // Resolve the feature add-order: an explicit array order (above) wins;
  // otherwise order the map test-first, then the remaining names sorted, so
  // the outcome is deterministic and `test` is always the base transport.
  if (0 === featureorder.length) {
    let names = Object.keys(opts.feature || {}).sort()
    names = names.indexOf('test') < 0
      ? names
      : ['test'].concat(names.filter((n: string) => 'test' !== n))
    const si = names.indexOf('station')
    if (0 <= si) {
      names.splice(si, 1)
      names.splice(names.indexOf('test') + 1, 0, 'station')
    }
    featureorder = names
  }

  opts.__derived__ = {
    clean: cleancfg,
    featureorder,
  }

  // Again over the merged result: the config's own defaults can carry one.
  cleanAddSensitive({ options: opts } as any, settings(opts))

  return opts
}


// Registration skips entity blocks: entity settings and seed records hold no credential.
function settings(opts: any): any {
  const noent = (b: any) => null != b && 'object' === typeof b && !Array.isArray(b)
    ? { ...b, entity: undefined } : b
  const feature = Array.isArray(opts.feature) ? opts.feature.map(noent)
    : null != opts.feature && 'object' === typeof opts.feature
      ? Object.fromEntries(Object.entries(opts.feature).map(([k, v]) => [k, noent(v)]))
      : opts.feature
  return { ...opts, clean: undefined, __derived__: undefined, entity: undefined,
    test: noent(opts.test), feature }
}


export {
  makeOptions
}
