import { describe, test } from 'node:test'
import { SDK } from '..'
import { runDefinitionPoint } from './definition-runner'
import { isControlSkipped } from './utility'


// Generated from the API definition, not from the model this SDK was built
// from: the route, the declared query parameters, the credential the security
// scheme names, and the definition's own response example.
const PLAN: any[] = [
  {
    "entity": "stuff",
    "accessor": "Stuff",
    "op": "load",
    "method": "GET",
    "path": "/logs",
    "args": [],
    "select": {
      "app": "my.app.ch",
      "line": "v1",
      "service": "v2018_bueber",
      "version": "1.0.42"
    },
    "headers": [],
    "query": [
      "service",
      "lines",
      "app",
      "version"
    ],
    "auth": null,
    "status": 200,
    "sample": null,
    "idField": "id"
  },
  {
    "entity": "stuff",
    "accessor": "Stuff",
    "op": "load",
    "method": "GET",
    "path": "/rawdata",
    "args": [],
    "select": {
      "app": "my.app.ch",
      "service": "v2018_bueber",
      "version": "1.0.42"
    },
    "headers": [],
    "query": [
      "service",
      "app",
      "version"
    ],
    "auth": null,
    "status": 200,
    "sample": null,
    "idField": "id"
  },
  {
    "entity": "stuff",
    "accessor": "Stuff",
    "op": "load",
    "method": "GET",
    "path": "/slack",
    "args": [],
    "select": {},
    "headers": [],
    "query": [],
    "auth": null,
    "status": 200,
    "sample": null,
    "idField": "id"
  },
  {
    "entity": "v2018",
    "accessor": "V2018",
    "op": "load",
    "method": "GET",
    "path": "/v2018/history",
    "action": "history",
    "args": [],
    "select": {
      "app": "my.app.ch",
      "city": "bern",
      "end": "v1",
      "start": "v1",
      "value": "v1",
      "version": "1.0.42"
    },
    "headers": [],
    "query": [
      "city",
      "start",
      "end",
      "app",
      "version",
      "values"
    ],
    "auth": null,
    "status": 200,
    "sample": null,
    "idField": "id"
  },
  {
    "entity": "v2018",
    "accessor": "V2018",
    "op": "load",
    "method": "GET",
    "path": "/v2018/current",
    "action": "current",
    "args": [],
    "select": {
      "app": "my.app.ch",
      "city": "bern",
      "value": "v1",
      "version": "1.0.42"
    },
    "headers": [],
    "query": [
      "city",
      "app",
      "version",
      "values"
    ],
    "auth": null,
    "status": 200,
    "sample": null,
    "idField": "id"
  },
  {
    "entity": "v2018",
    "accessor": "V2018",
    "op": "load",
    "method": "GET",
    "path": "/v2018/today",
    "action": "today",
    "args": [],
    "select": {
      "app": "my.app.ch",
      "city": "bern",
      "value": "v1",
      "version": "1.0.42"
    },
    "headers": [],
    "query": [
      "city",
      "app",
      "version",
      "values"
    ],
    "auth": null,
    "status": 200,
    "sample": null,
    "idField": "id"
  },
  {
    "entity": "v2018",
    "accessor": "V2018",
    "op": "load",
    "method": "GET",
    "path": "/v2018/cities",
    "action": "city",
    "args": [],
    "select": {
      "app": "my.app.ch",
      "value": "v1",
      "version": "1.0.42"
    },
    "headers": [],
    "query": [
      "app",
      "version",
      "values"
    ],
    "auth": null,
    "status": 200,
    "sample": null,
    "idField": "id"
  },
  {
    "entity": "v2018",
    "accessor": "V2018",
    "op": "load",
    "method": "GET",
    "path": "/v2018/widget",
    "action": "widget",
    "args": [],
    "select": {
      "app": "my.app.ch",
      "value": "v1",
      "version": "1.0.42"
    },
    "headers": [],
    "query": [
      "app",
      "version",
      "values"
    ],
    "auth": null,
    "status": 200,
    "sample": null,
    "idField": "id"
  }
]


describe('definition', () => {
  for (const point of PLAN) {
    test(point.entity + '.' + point.op + ' ' + point.method + ' ' + point.path, async (t) => {
      const control = isControlSkipped('entityOp', point.entity + '.' + point.op, 'definition')
      if (control.skip) {
        t.skip(control.reason || 'skipped via sdk-test-control.json')
        return
      }
      await runDefinitionPoint(SDK, point)
    })
  }
})
