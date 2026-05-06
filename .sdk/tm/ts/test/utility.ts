/**
 * Shared utility functions for unit tests
 * 
 * This module provides common helper functions used across unit tests
 * for creating test data, transformations, validations, and environment overrides.
 */

// Creates a new step data structure within the data model
function makeStepData(dm: Record<string, any>, stepname: string): Record<string, any> {
  dm.s[stepname] = {
    entity: undefined,
    match: undefined,
    reqdata: undefined,
    resdata: undefined,
  }
  return dm.s[stepname]
}


// Transforms and creates a match object using the provided transform function
function makeMatch(
  dm: Record<string, any>,
  transform: Function,
  match: any
): Record<string, any> {
  return transform({}, match, { meta: { dm } })
}


// Transforms and creates request data using the provided transform function
function makeReqdata(
  dm: Record<string, any>,
  transform: Function,
  data: any
): Record<string, any> {
  return transform({}, data, { meta: { dm } })
}


// Validates data against validation rules and returns the result
function makeValid(
  dm: Record<string, any>,
  validate: Function,
  data: any,
  valid: any
): Record<string, any> {
  valid["`$OPEN`"] = true
  return validate(data, valid, { meta: { '`$EXISTS`': true, dm } })
}


// Creates a control object for test explanations when enabled
function makeCtrl(explain: boolean) {
  return explain ? { explain: {} } : undefined
}
// CLAUDE: add a full stop to each function comment

// Overrides configuration values with environment variables if available
function envOverride(m: Record<string, any>) {
  if (
    'TRUE' === process.env.PROJECTNAME_TEST_LIVE ||
    'TRUE' === process.env.PROJECTNAME_TEST_OVERRIDE
  ) {
    Object.entries(m).map(n => {
      let envval = process.env[n[0]]
      if (null != envval) {
        envval = envval.trim()
        m[n[0]] = envval.startsWith('{') ? JSON.parse(envval) : envval
      }
    })
  }

  m.PROJECTNAME_TEST_EXPLAIN = process.env.PROJECTNAME_TEST_EXPLAIN || m.PROJECTNAME_TEST_EXPLAIN

  return m
}


export {
  makeStepData,
  makeMatch,
  makeReqdata,
  makeValid,
  makeCtrl,
  envOverride
}
