// Typed models for the Aareguru SDK.
//
// GENERATED from the API model: main.kit.entity.<e>.fields{} and per-op
// params (op.<name>.points[].g.params[]). Field/param types come from the
// canonical type sentinels via @voxgig/sdkgen canonToType (source of truth:
// @voxgig/apidef VALID_CANON). Do not edit by hand.

export interface Legacy {
}

export interface LegacyLoadMatch {
  app?: string
  version?: string
}

export interface Stuff {
}

export interface StuffLoadMatch {
  app?: string
  line?: number
  service: string
  version?: string
}

export interface V2018 {
}

export interface V2018LoadMatch {
  app?: string
  city: string
  end: string
  start: string
  value?: string
  version?: string

  // Selects a custom action instead of the plain load:
  //   'city' | 'current' | 'history' | 'today' | 'widget'
  // The remaining keys are that action's own payload.
  $action?: string
  [action: string]: any
}

