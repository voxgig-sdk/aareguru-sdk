"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const Fs = __importStar(require("node:fs"));
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const live_runner_1 = require("../../live-runner");
const live_entity_1 = require("../../live-entity");
const __1 = require("../../..");
const utility_1 = require("../../utility");
(0, utility_1.loadEnvLocal)(__dirname + '/../../../.env.local');
(0, node_test_1.describe)('StuffEntity', async () => {
    // Per-test live pacing. Delay is read from sdk-test-control.json's
    // `test.live.delayMs`; only sleeps when AAREGURU_TEST_LIVE=TRUE.
    (0, node_test_1.afterEach)((0, utility_1.liveDelay)('AAREGURU_TEST_LIVE'));
    (0, node_test_1.test)('instance', async () => {
        const testsdk = __1.AareguruSDK.test();
        const ent = testsdk.Stuff();
        (0, node_assert_1.default)(null != ent);
    });
    (0, node_test_1.test)('basic', async (t) => {
        const live = 'TRUE' === process.env.AAREGURU_TEST_LIVE;
        for (const op of ['load']) {
            if (!live && (0, utility_1.maybeSkipControl)(t, 'entityOp', 'stuff.' + op, live))
                return;
        }
        const setup = basicSetup();
        if (setup.live) {
            return (0, live_entity_1.runLiveEntity)(setup, { "active": true, "alias": { "field": {} }, "fields": {}, "name": "stuff", "op": { "load": { "input": "data", "name": "load", "points": [{ "a": true, "co": { "id": "GET /logs", "source": "openapi3", "version": 2 }, "g": { "query": [{ "a": true, "ex": "my.app.ch", "k": "query", "n": "app", "or": "app", "r": false, "t": "`$STRING`", "index$": 0 }, { "a": true, "ex": 12, "k": "query", "n": "line", "or": "line", "r": false, "t": "`$INTEGER`", "index$": 1 }, { "a": true, "ex": "v2018_bueber", "k": "query", "n": "service", "or": "service", "r": true, "t": "`$STRING`", "index$": 2 }, { "a": true, "ex": "1.0.42", "k": "query", "n": "version", "or": "version", "r": false, "t": "`$STRING`", "index$": 3 }] }, "k": "http", "m": "GET", "o": "/logs", "q": { "exist": ["app", "line", "service", "version"] }, "r": {}, "s": [{ "lit": "logs" }], "t": { "req": "`reqdata`", "res": "`body`" }, "index$": 0 }, { "a": true, "co": { "id": "GET /rawdata", "source": "openapi3", "version": 2 }, "g": { "query": [{ "a": true, "ex": "my.app.ch", "k": "query", "n": "app", "or": "app", "r": false, "t": "`$STRING`", "index$": 0 }, { "a": true, "ex": "v2018_bueber", "k": "query", "n": "service", "or": "service", "r": true, "t": "`$STRING`", "index$": 1 }, { "a": true, "ex": "1.0.42", "k": "query", "n": "version", "or": "version", "r": false, "t": "`$STRING`", "index$": 2 }] }, "k": "http", "m": "GET", "o": "/rawdata", "q": { "exist": ["app", "service", "version"] }, "r": {}, "s": [{ "lit": "rawdata" }], "t": { "req": "`reqdata`", "res": "`body`" }, "index$": 1 }, { "a": true, "co": { "id": "GET /slack", "source": "openapi3", "version": 2 }, "g": {}, "k": "http", "m": "GET", "o": "/slack", "q": {}, "r": {}, "s": [{ "lit": "slack" }], "t": { "req": "`reqdata`", "res": "`body`" }, "index$": 2 }], "key$": "load" } }, "relations": { "ancestors": [] }, "key$": "stuff", "name__orig": "stuff", "Name": "Stuff", "name_": "stuff", "name-": "stuff", "NAME": "STUFF", "index$": 1 }, { "active": true, "entity": "stuff", "key$": "BasicStuffFlow", "kind": "basic", "name": "BasicStuffFlow", "param": {}, "step": [{ "a": true, "d": {}, "i": { "ref": "stuff_ref01", "srcdatavar": "stuff_ref01_data", "suffix": "_dt0" }, "m": {}, "o": "load", "s": [], "v": [{ "apply": "TextFieldMark", "def": { "mark": "Mark01-stuff_ref01" } }], "index$": 0 }] }, 'Stuff', { "GET /logs": { "protocol": "http", "responses": { "200": { "description": "OK" } }, "parameters": [{ "name": "service", "in": "query", "description": "Interner Servicename", "required": true, "schema": { "type": "string" }, "example": "v2018_bueber", "x-ref": "#/components/parameters/service", "index$": 0 }, { "name": "lines", "in": "query", "description": "Anzahl Zeilen", "required": false, "schema": { "type": "integer", "default": 12 }, "x-ref": "#/components/parameters/lines", "index$": 1 }, { "name": "app", "in": "query", "description": "Optionaler App-Name.", "schema": { "type": "string" }, "example": "my.app.ch", "x-ref": "#/components/parameters/app", "index$": 2 }, { "name": "version", "in": "query", "description": "Optionale Versionsnummer für diese App.", "schema": { "type": "string" }, "example": "1.0.42", "x-ref": "#/components/parameters/version", "index$": 3 }], "securitySource": "unspecified" }, "GET /rawdata": { "protocol": "http", "responses": { "200": { "description": "OK" } }, "parameters": [{ "name": "service", "in": "query", "description": "Interner Servicename", "required": true, "schema": { "type": "string" }, "example": "v2018_bueber", "x-ref": "#/components/parameters/service", "index$": 0 }, { "name": "app", "in": "query", "description": "Optionaler App-Name.", "schema": { "type": "string" }, "example": "my.app.ch", "x-ref": "#/components/parameters/app", "index$": 1 }, { "name": "version", "in": "query", "description": "Optionale Versionsnummer für diese App.", "schema": { "type": "string" }, "example": "1.0.42", "x-ref": "#/components/parameters/version", "index$": 2 }], "securitySource": "unspecified" }, "GET /slack": { "protocol": "http", "responses": { "200": { "description": "OK" } }, "parameters": [], "securitySource": "unspecified" } });
        }
        const client = setup.client;
        const struct = setup.struct;
        const isempty = struct.isempty;
        const select = struct.select;
        let stuff_ref01_data = Object.values(setup.data.existing.stuff)[0];
        // LOAD
        const stuff_ref01_ent = client.Stuff();
        const stuff_ref01_match_dt0 = {};
        const stuff_ref01_data_dt0 = (await stuff_ref01_ent.load(stuff_ref01_match_dt0)).data();
        (0, node_assert_1.default)(null != stuff_ref01_data_dt0);
    });
});
function basicSetup(extra) {
    // TODO: fix test def options
    const options = {}; // null
    // TODO: needs test utility to resolve path
    const entityDataFile = node_path_1.default.resolve(__dirname, '../../../../.sdk/test/entity/stuff/StuffTestData.json');
    // TODO: file ready util needed?
    const entityDataSource = Fs.readFileSync(entityDataFile).toString('utf8');
    // TODO: need a xlang JSON parse utility in voxgig/struct with better error msgs
    const entityData = JSON.parse(entityDataSource);
    options.entity = entityData.existing;
    let client = __1.AareguruSDK.test(options, extra);
    const struct = client.utility().struct;
    const merge = struct.merge;
    const transform = struct.transform;
    let idmap = transform(['stuff01', 'stuff02', 'stuff03'], {
        '`$PACK`': ['', {
                '`$KEY`': '`$COPY`',
                '`$VAL`': ['`$FORMAT`', 'upper', '`$COPY`']
            }]
    });
    const env = (0, utility_1.envOverride)({
        'AAREGURU_TEST_STUFF_ENTID': idmap,
        'AAREGURU_TEST_LIVE': 'FALSE',
        'AAREGURU_TEST_EXPLAIN': 'FALSE',
    });
    idmap = env['AAREGURU_TEST_STUFF_ENTID'];
    const live = 'TRUE' === env.AAREGURU_TEST_LIVE;
    const transport = (0, live_runner_1.createLiveTransport)();
    if (live) {
        const rawIds = process.env['AAREGURU_TEST_STUFF_ENTID'];
        idmap = rawIds && rawIds.trim() ? JSON.parse(rawIds) : {};
        if (!idmap || Array.isArray(idmap) || typeof idmap !== 'object') {
            throw new Error('Live ENTID must be a JSON object');
        }
        client = new __1.AareguruSDK(merge([
            // FIRST, so the generated fields below win: sdk-test-control.json's
            // test.client.options adds to the live client, it does not redirect it.
            (0, utility_1.liveClientOptions)(),
            {},
            // 'extra || {}', not a bare 'extra': struct.merge returns UNDEFINED when the
            // last entry is undefined, and basicSetup is normally called with no
            // argument at all - so a bare 'extra' silently discarded the apikey
            // and server values above and handed the SDK undefined. Harmless
            // while there was nothing in that object; not harmless now.
            extra || {},
            { system: { fetch: transport.fetch } }
        ]));
    }
    const setup = {
        idmap,
        env,
        options,
        client,
        struct,
        data: entityData,
        explain: 'TRUE' === env.AAREGURU_TEST_EXPLAIN,
        live,
        transport,
        now: Date.now(),
    };
    return setup;
}
//# sourceMappingURL=StuffEntity.test.js.map