// VENDORED: @voxgig/omni 0.1.5 (typescript/src/index.ts)
// Source: https://github.com/voxgig/omni @ e9cb45a308a4da47ffdbc1b3149b9c59199190b2  [tag: sdk-20261016-0845-0]
// License: MIT (c) voxgig - see repository LICENSE. Do not edit: resync from upstream.
// @voxgig/omni - shared multi-language test runner.

export {
  CAPABILITIES,
  EXISTSMARK,
  NULLMARK,
  OmniError,
  SPECVERSION,
  UNDEFMARK,
  errify,
  fixjson,
  loadspec,
  makeRunner,
  match,
  matchval,
  nullmodifier,
  resolvespec,
} from './Runner'

export type { Flags, Provider, RunPack, RunSet, RunSetFlags, Runner, Subject } from './Runner'

export {
  clone,
  deepequal,
  getpath,
  islist,
  ismap,
  isnode,
  jsonstr,
  pathify,
  stringify,
  walk,
} from './Util'

export type { Json } from './Util'
