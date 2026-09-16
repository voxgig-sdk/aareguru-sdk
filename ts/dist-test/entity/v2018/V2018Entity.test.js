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
// AFTER the imports on purpose: TypeScript hoists `import` above any
// statement in the emitted CommonJS, so a loader placed above them would
// run only after every imported module had already been evaluated - and
// anything reading process.env at module scope would miss these values.
(0, utility_1.loadEnvLocal)(__dirname + '/../../../.env.local');
(0, node_test_1.describe)('V2018Entity', async () => {
    // Per-test live pacing. Delay is read from sdk-test-control.json's
    // `test.live.delayMs`; only sleeps when AAREGURU_TEST_LIVE=TRUE.
    (0, node_test_1.afterEach)((0, utility_1.liveDelay)('AAREGURU_TEST_LIVE'));
    (0, node_test_1.test)('instance', async () => {
        const testsdk = __1.AareguruSDK.test();
        const ent = testsdk.V2018();
        (0, node_assert_1.default)(null != ent);
    });
    (0, node_test_1.test)('basic', async (t) => {
        const live = 'TRUE' === process.env.AAREGURU_TEST_LIVE;
        for (const op of ['load']) {
            if (!live && (0, utility_1.maybeSkipControl)(t, 'entityOp', 'v2018.' + op, live))
                return;
        }
        const setup = basicSetup();
        if (setup.live) {
            return (0, live_entity_1.runLiveEntity)(setup, { "active": true, "alias": { "field": {} }, "fields": [], "name": "v2018", "op": { "load": { "input": "data", "name": "load", "points": [{ "active": true, "args": { "query": [{ "active": true, "example": "my.app.ch", "kind": "query", "name": "app", "orig": "app", "reqd": false, "type": "`$STRING`", "index$": 0 }, { "active": true, "example": "bern", "kind": "query", "name": "city", "orig": "city", "reqd": true, "type": "`$STRING`", "index$": 1 }, { "active": true, "example": "2025-02-13", "kind": "query", "name": "end", "orig": "end", "reqd": true, "type": "`$STRING`", "index$": 2 }, { "active": true, "example": "2025-01-01", "kind": "query", "name": "start", "orig": "start", "reqd": true, "type": "`$STRING`", "index$": 3 }, { "active": true, "example": null, "kind": "query", "name": "value", "orig": "value", "reqd": false, "type": "`$STRING`", "index$": 4 }, { "active": true, "example": "1.0.42", "kind": "query", "name": "version", "orig": "version", "reqd": false, "type": "`$STRING`", "index$": 5 }] }, "contract": { "id": "GET /v2018/history", "json": "{\"parameters\":[{\"description\":\"Orts-Identifikator aus der Ortsliste. (Hier obligatorisch.)\",\"example\":\"bern\",\"in\":\"query\",\"name\":\"city\",\"required\":true,\"schema\":{\"type\":\"string\"}},{\"description\":\"Startdatum und -Zeit (UTC) in irgendeinem Format (ISO, Timestamp, yesterday, -1 day).\",\"examples\":{\"Datum\":{\"value\":\"2025-01-01\"},\"Vor einem Tag\":{\"value\":\"-1 day\"},\"Zeitstempel\":{\"value\":1234567890}},\"in\":\"query\",\"name\":\"start\",\"required\":true,\"schema\":{\"type\":\"string\"}},{\"description\":\"Enddatum und -Zeit (UTC) in irgendeinem Format (ISO, Timestamp, now).\",\"examples\":{\"Datum\":{\"value\":\"2025-02-13\"},\"Jetzt\":{\"value\":\"now\"},\"Zeitstempel\":{\"value\":1234567891}},\"in\":\"query\",\"name\":\"end\",\"required\":true,\"schema\":{\"type\":\"string\"}},{\"description\":\"Optionaler App-Name.\",\"example\":\"my.app.ch\",\"in\":\"query\",\"name\":\"app\",\"schema\":{\"type\":\"string\"}},{\"description\":\"Optionale Versionsnummer für diese App.\",\"example\":\"1.0.42\",\"in\":\"query\",\"name\":\"version\",\"schema\":{\"type\":\"string\"}},{\"description\":\"Optional kommata-separierte Wertenamen, adressiert mit gepunkteten Strings. Damit werden nur einzelne Werte (einer pro Zeile) extrahiert und die ganze Response als Text zurückgegeben.\",\"examples\":{\"Einzelner Wert\":{\"description\":\"Einzelner Wert (Für Methode current)\",\"value\":\"aare.temperature\"},\"Mehrere Werte\":{\"description\":\"Mehrere Werte (Für Methode current)\",\"value\":\"aare.temperature,aare.temperature_text,sun.sunlocations.0.timeleft\"},\"none\":{\"value\":null}},\"in\":\"query\",\"name\":\"values\",\"required\":false,\"schema\":{\"type\":\"string\"}}],\"protocol\":\"http\",\"responses\":{\"200\":{\"description\":\"OK\"}},\"securitySource\":\"unspecified\"}", "source": "openapi3", "version": 1 }, "kind": "http", "method": "GET", "orig": "/v2018/history", "segments": [{ "lit": "v2018" }, { "lit": "history" }], "select": { "$action": "history", "exist": ["app", "city", "end", "start", "value", "version"] }, "transform": { "req": "`reqdata`", "res": "`body`" }, "index$": 0 }, { "active": true, "args": { "query": [{ "active": true, "example": "my.app.ch", "kind": "query", "name": "app", "orig": "app", "reqd": false, "type": "`$STRING`", "index$": 0 }, { "active": true, "example": "bern", "kind": "query", "name": "city", "orig": "city", "reqd": false, "type": "`$STRING`", "index$": 1 }, { "active": true, "example": null, "kind": "query", "name": "value", "orig": "value", "reqd": false, "type": "`$STRING`", "index$": 2 }, { "active": true, "example": "1.0.42", "kind": "query", "name": "version", "orig": "version", "reqd": false, "type": "`$STRING`", "index$": 3 }] }, "contract": { "id": "GET /v2018/current", "json": "{\"parameters\":[{\"description\":\"Orts-Identifikator aus der Ortsliste.\",\"example\":\"bern\",\"in\":\"query\",\"name\":\"city\",\"schema\":{\"default\":\"bern\",\"type\":\"string\"}},{\"description\":\"Optionaler App-Name.\",\"example\":\"my.app.ch\",\"in\":\"query\",\"name\":\"app\",\"schema\":{\"type\":\"string\"}},{\"description\":\"Optionale Versionsnummer für diese App.\",\"example\":\"1.0.42\",\"in\":\"query\",\"name\":\"version\",\"schema\":{\"type\":\"string\"}},{\"description\":\"Optional kommata-separierte Wertenamen, adressiert mit gepunkteten Strings. Damit werden nur einzelne Werte (einer pro Zeile) extrahiert und die ganze Response als Text zurückgegeben.\",\"examples\":{\"Einzelner Wert\":{\"description\":\"Einzelner Wert (Für Methode current)\",\"value\":\"aare.temperature\"},\"Mehrere Werte\":{\"description\":\"Mehrere Werte (Für Methode current)\",\"value\":\"aare.temperature,aare.temperature_text,sun.sunlocations.0.timeleft\"},\"none\":{\"value\":null}},\"in\":\"query\",\"name\":\"values\",\"required\":false,\"schema\":{\"type\":\"string\"}}],\"protocol\":\"http\",\"responses\":{\"200\":{\"description\":\"OK\"}},\"securitySource\":\"unspecified\"}", "source": "openapi3", "version": 1 }, "kind": "http", "method": "GET", "orig": "/v2018/current", "segments": [{ "lit": "v2018" }, { "lit": "current" }], "select": { "$action": "current", "exist": ["app", "city", "value", "version"] }, "transform": { "req": "`reqdata`", "res": "`body`" }, "index$": 1 }, { "active": true, "args": { "query": [{ "active": true, "example": "my.app.ch", "kind": "query", "name": "app", "orig": "app", "reqd": false, "type": "`$STRING`", "index$": 0 }, { "active": true, "example": "bern", "kind": "query", "name": "city", "orig": "city", "reqd": false, "type": "`$STRING`", "index$": 1 }, { "active": true, "example": null, "kind": "query", "name": "value", "orig": "value", "reqd": false, "type": "`$STRING`", "index$": 2 }, { "active": true, "example": "1.0.42", "kind": "query", "name": "version", "orig": "version", "reqd": false, "type": "`$STRING`", "index$": 3 }] }, "contract": { "id": "GET /v2018/today", "json": "{\"parameters\":[{\"description\":\"Orts-Identifikator aus der Ortsliste.\",\"example\":\"bern\",\"in\":\"query\",\"name\":\"city\",\"schema\":{\"default\":\"bern\",\"type\":\"string\"}},{\"description\":\"Optionaler App-Name.\",\"example\":\"my.app.ch\",\"in\":\"query\",\"name\":\"app\",\"schema\":{\"type\":\"string\"}},{\"description\":\"Optionale Versionsnummer für diese App.\",\"example\":\"1.0.42\",\"in\":\"query\",\"name\":\"version\",\"schema\":{\"type\":\"string\"}},{\"description\":\"Optional kommata-separierte Wertenamen, adressiert mit gepunkteten Strings. Damit werden nur einzelne Werte (einer pro Zeile) extrahiert und die ganze Response als Text zurückgegeben.\",\"examples\":{\"Einzelner Wert\":{\"description\":\"Einzelner Wert (Für Methode current)\",\"value\":\"aare.temperature\"},\"Mehrere Werte\":{\"description\":\"Mehrere Werte (Für Methode current)\",\"value\":\"aare.temperature,aare.temperature_text,sun.sunlocations.0.timeleft\"},\"none\":{\"value\":null}},\"in\":\"query\",\"name\":\"values\",\"required\":false,\"schema\":{\"type\":\"string\"}}],\"protocol\":\"http\",\"responses\":{\"200\":{\"description\":\"OK\"}},\"securitySource\":\"unspecified\"}", "source": "openapi3", "version": 1 }, "kind": "http", "method": "GET", "orig": "/v2018/today", "segments": [{ "lit": "v2018" }, { "lit": "today" }], "select": { "$action": "today", "exist": ["app", "city", "value", "version"] }, "transform": { "req": "`reqdata`", "res": "`body`" }, "index$": 2 }, { "active": true, "args": { "query": [{ "active": true, "example": "my.app.ch", "kind": "query", "name": "app", "orig": "app", "reqd": false, "type": "`$STRING`", "index$": 0 }, { "active": true, "example": null, "kind": "query", "name": "value", "orig": "value", "reqd": false, "type": "`$STRING`", "index$": 1 }, { "active": true, "example": "1.0.42", "kind": "query", "name": "version", "orig": "version", "reqd": false, "type": "`$STRING`", "index$": 2 }] }, "contract": { "id": "GET /v2018/cities", "json": "{\"parameters\":[{\"description\":\"Optionaler App-Name.\",\"example\":\"my.app.ch\",\"in\":\"query\",\"name\":\"app\",\"schema\":{\"type\":\"string\"}},{\"description\":\"Optionale Versionsnummer für diese App.\",\"example\":\"1.0.42\",\"in\":\"query\",\"name\":\"version\",\"schema\":{\"type\":\"string\"}},{\"description\":\"Optional kommata-separierte Wertenamen, adressiert mit gepunkteten Strings. Damit werden nur einzelne Werte (einer pro Zeile) extrahiert und die ganze Response als Text zurückgegeben.\",\"examples\":{\"Einzelner Wert\":{\"description\":\"Einzelner Wert (Für Methode current)\",\"value\":\"aare.temperature\"},\"Mehrere Werte\":{\"description\":\"Mehrere Werte (Für Methode current)\",\"value\":\"aare.temperature,aare.temperature_text,sun.sunlocations.0.timeleft\"},\"none\":{\"value\":null}},\"in\":\"query\",\"name\":\"values\",\"required\":false,\"schema\":{\"type\":\"string\"}}],\"protocol\":\"http\",\"responses\":{\"200\":{\"description\":\"OK\"}},\"securitySource\":\"unspecified\"}", "source": "openapi3", "version": 1 }, "kind": "http", "method": "GET", "orig": "/v2018/cities", "segments": [{ "lit": "v2018" }, { "lit": "cities" }], "select": { "$action": "city", "exist": ["app", "value", "version"] }, "transform": { "req": "`reqdata`", "res": "`body`" }, "index$": 3 }, { "active": true, "args": { "query": [{ "active": true, "example": "my.app.ch", "kind": "query", "name": "app", "orig": "app", "reqd": false, "type": "`$STRING`", "index$": 0 }, { "active": true, "example": null, "kind": "query", "name": "value", "orig": "value", "reqd": false, "type": "`$STRING`", "index$": 1 }, { "active": true, "example": "1.0.42", "kind": "query", "name": "version", "orig": "version", "reqd": false, "type": "`$STRING`", "index$": 2 }] }, "contract": { "id": "GET /v2018/widget", "json": "{\"parameters\":[{\"description\":\"Optionaler App-Name.\",\"example\":\"my.app.ch\",\"in\":\"query\",\"name\":\"app\",\"schema\":{\"type\":\"string\"}},{\"description\":\"Optionale Versionsnummer für diese App.\",\"example\":\"1.0.42\",\"in\":\"query\",\"name\":\"version\",\"schema\":{\"type\":\"string\"}},{\"description\":\"Optional kommata-separierte Wertenamen, adressiert mit gepunkteten Strings. Damit werden nur einzelne Werte (einer pro Zeile) extrahiert und die ganze Response als Text zurückgegeben.\",\"examples\":{\"Einzelner Wert\":{\"description\":\"Einzelner Wert (Für Methode current)\",\"value\":\"aare.temperature\"},\"Mehrere Werte\":{\"description\":\"Mehrere Werte (Für Methode current)\",\"value\":\"aare.temperature,aare.temperature_text,sun.sunlocations.0.timeleft\"},\"none\":{\"value\":null}},\"in\":\"query\",\"name\":\"values\",\"required\":false,\"schema\":{\"type\":\"string\"}}],\"protocol\":\"http\",\"responses\":{\"200\":{\"description\":\"OK\"}},\"securitySource\":\"unspecified\"}", "source": "openapi3", "version": 1 }, "kind": "http", "method": "GET", "orig": "/v2018/widget", "segments": [{ "lit": "v2018" }, { "lit": "widget" }], "select": { "$action": "widget", "exist": ["app", "value", "version"] }, "transform": { "req": "`reqdata`", "res": "`body`" }, "index$": 4 }], "key$": "load" } }, "relations": { "ancestors": [] }, "key$": "v2018", "name__orig": "v2018", "Name": "V2018", "name_": "v2018", "name-": "v2018", "NAME": "V2018", "index$": 2 }, { "active": true, "entity": "v2018", "key$": "BasicV2018Flow", "kind": "basic", "name": "BasicV2018Flow", "param": {}, "step": [{ "active": true, "data": {}, "input": { "ref": "v2018_ref01", "srcdatavar": "v2018_ref01_data", "suffix": "_dt0" }, "match": {}, "op": "load", "spec": [], "valid": [{ "apply": "TextFieldMark", "def": { "mark": "Mark01-v2018_ref01" } }], "index$": 0 }] }, 'V2018');
        }
        const client = setup.client;
        const struct = setup.struct;
        const isempty = struct.isempty;
        const select = struct.select;
        let v2018_ref01_data = Object.values(setup.data.existing.v2018)[0];
        // LOAD
        const v2018_ref01_ent = client.V2018();
        const v2018_ref01_match_dt0 = {};
        const v2018_ref01_data_dt0 = (await v2018_ref01_ent.load(v2018_ref01_match_dt0)).data();
        (0, node_assert_1.default)(null != v2018_ref01_data_dt0);
    });
});
function basicSetup(extra) {
    // TODO: fix test def options
    const options = {}; // null
    // TODO: needs test utility to resolve path
    const entityDataFile = node_path_1.default.resolve(__dirname, '../../../../.sdk/test/entity/v2018/V2018TestData.json');
    // TODO: file ready util needed?
    const entityDataSource = Fs.readFileSync(entityDataFile).toString('utf8');
    // TODO: need a xlang JSON parse utility in voxgig/struct with better error msgs
    const entityData = JSON.parse(entityDataSource);
    options.entity = entityData.existing;
    let client = __1.AareguruSDK.test(options, extra);
    const struct = client.utility().struct;
    const merge = struct.merge;
    const transform = struct.transform;
    let idmap = transform(['v201801', 'v201802', 'v201803'], {
        '`$PACK`': ['', {
                '`$KEY`': '`$COPY`',
                '`$VAL`': ['`$FORMAT`', 'upper', '`$COPY`']
            }]
    });
    const env = (0, utility_1.envOverride)({
        'AAREGURU_TEST_V2018_ENTID': idmap,
        'AAREGURU_TEST_LIVE': 'FALSE',
        'AAREGURU_TEST_EXPLAIN': 'FALSE',
    });
    idmap = env['AAREGURU_TEST_V2018_ENTID'];
    const live = 'TRUE' === env.AAREGURU_TEST_LIVE;
    const transport = (0, live_runner_1.createLiveTransport)();
    if (live) {
        const rawIds = process.env['AAREGURU_TEST_V2018_ENTID'];
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
//# sourceMappingURL=V2018Entity.test.js.map