"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const __1 = require("..");
const definition_runner_1 = require("./definition-runner");
const utility_1 = require("./utility");
// Generated from the API definition, not from the model this SDK was built
// from: the route, the declared query parameters, the credential the security
// scheme names, and the definition's own response example.
const PLAN = [
    {
        "entity": "stuff",
        "accessor": "Stuff",
        "op": "load",
        "method": "GET",
        "path": "/slack",
        "args": [],
        "select": {},
        "headers": [],
        "cookies": [],
        "query": [],
        "queryArgs": [],
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
            "city": "bern",
            "end": "v1",
            "start": "v1",
            "app": "my.app.ch",
            "value": "v1",
            "version": "1.0.42"
        },
        "headers": [],
        "cookies": [],
        "query": [
            "city",
            "start",
            "end",
            "app",
            "version",
            "values"
        ],
        "queryArgs": [
            {
                "name": "app",
                "wire": "app"
            },
            {
                "name": "city",
                "wire": "city"
            },
            {
                "name": "end",
                "wire": "end"
            },
            {
                "name": "start",
                "wire": "start"
            },
            {
                "name": "value",
                "wire": "values"
            },
            {
                "name": "version",
                "wire": "version"
            }
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
        "cookies": [],
        "query": [
            "app",
            "version",
            "values"
        ],
        "queryArgs": [
            {
                "name": "app",
                "wire": "app"
            },
            {
                "name": "value",
                "wire": "values"
            },
            {
                "name": "version",
                "wire": "version"
            }
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
            "value": "v1",
            "version": "1.0.42"
        },
        "headers": [],
        "cookies": [],
        "query": [
            "city",
            "app",
            "version",
            "values"
        ],
        "queryArgs": [
            {
                "name": "app",
                "wire": "app"
            },
            {
                "name": "value",
                "wire": "values"
            },
            {
                "name": "version",
                "wire": "version"
            }
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
            "value": "v1",
            "version": "1.0.42"
        },
        "headers": [],
        "cookies": [],
        "query": [
            "city",
            "app",
            "version",
            "values"
        ],
        "queryArgs": [
            {
                "name": "app",
                "wire": "app"
            },
            {
                "name": "value",
                "wire": "values"
            },
            {
                "name": "version",
                "wire": "version"
            }
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
        "cookies": [],
        "query": [
            "app",
            "version",
            "values"
        ],
        "queryArgs": [
            {
                "name": "app",
                "wire": "app"
            },
            {
                "name": "value",
                "wire": "values"
            },
            {
                "name": "version",
                "wire": "version"
            }
        ],
        "auth": null,
        "status": 200,
        "sample": null,
        "idField": "id"
    }
];
(0, node_test_1.describe)('definition', () => {
    for (const point of PLAN) {
        (0, node_test_1.test)(point.entity + '.' + point.op + ' ' + point.method + ' ' + point.path, async (t) => {
            const control = (0, utility_1.isControlSkipped)('entityOp', point.entity + '.' + point.op, 'definition');
            if (control.skip) {
                t.skip(control.reason || 'skipped via sdk-test-control.json');
                return;
            }
            await (0, definition_runner_1.runDefinitionPoint)(__1.SDK, point);
        });
    }
});
//# sourceMappingURL=definition.test.js.map