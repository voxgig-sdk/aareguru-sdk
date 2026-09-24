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
            return (0, live_entity_1.runLiveEntity)(setup, { "active": true, "alias": { "field": {} }, "fields": {}, "name": "v2018", "op": { "load": { "input": "data", "name": "load", "points": [{ "a": true, "co": { "id": "GET /v2018/history", "source": "openapi3", "version": 2 }, "g": { "query": [{ "a": true, "ex": "my.app.ch", "k": "query", "n": "app", "or": "app", "r": false, "t": "`$STRING`", "index$": 0 }, { "a": true, "ex": "bern", "k": "query", "n": "city", "or": "city", "r": true, "t": "`$STRING`", "index$": 1 }, { "a": true, "ex": "2025-02-13", "k": "query", "n": "end", "or": "end", "r": true, "t": "`$STRING`", "index$": 2 }, { "a": true, "ex": "2025-01-01", "k": "query", "n": "start", "or": "start", "r": true, "t": "`$STRING`", "index$": 3 }, { "a": true, "ex": null, "k": "query", "n": "value", "or": "value", "r": false, "t": "`$STRING`", "index$": 4 }, { "a": true, "ex": "1.0.42", "k": "query", "n": "version", "or": "version", "r": false, "t": "`$STRING`", "index$": 5 }] }, "k": "http", "m": "GET", "o": "/v2018/history", "q": { "$action": "history", "exist": ["app", "city", "end", "start", "value", "version"] }, "r": {}, "s": [{ "lit": "v2018" }, { "lit": "history" }], "t": { "req": "`reqdata`", "res": "`body`" }, "index$": 0 }, { "a": true, "co": { "id": "GET /v2018/current", "source": "openapi3", "version": 2 }, "g": { "query": [{ "a": true, "ex": "my.app.ch", "k": "query", "n": "app", "or": "app", "r": false, "t": "`$STRING`", "index$": 0 }, { "a": true, "ex": "bern", "k": "query", "n": "city", "or": "city", "r": false, "t": "`$STRING`", "index$": 1 }, { "a": true, "ex": null, "k": "query", "n": "value", "or": "value", "r": false, "t": "`$STRING`", "index$": 2 }, { "a": true, "ex": "1.0.42", "k": "query", "n": "version", "or": "version", "r": false, "t": "`$STRING`", "index$": 3 }] }, "k": "http", "m": "GET", "o": "/v2018/current", "q": { "$action": "current", "exist": ["app", "city", "value", "version"] }, "r": {}, "s": [{ "lit": "v2018" }, { "lit": "current" }], "t": { "req": "`reqdata`", "res": "`body`" }, "index$": 1 }, { "a": true, "co": { "id": "GET /v2018/today", "source": "openapi3", "version": 2 }, "g": { "query": [{ "a": true, "ex": "my.app.ch", "k": "query", "n": "app", "or": "app", "r": false, "t": "`$STRING`", "index$": 0 }, { "a": true, "ex": "bern", "k": "query", "n": "city", "or": "city", "r": false, "t": "`$STRING`", "index$": 1 }, { "a": true, "ex": null, "k": "query", "n": "value", "or": "value", "r": false, "t": "`$STRING`", "index$": 2 }, { "a": true, "ex": "1.0.42", "k": "query", "n": "version", "or": "version", "r": false, "t": "`$STRING`", "index$": 3 }] }, "k": "http", "m": "GET", "o": "/v2018/today", "q": { "$action": "today", "exist": ["app", "city", "value", "version"] }, "r": {}, "s": [{ "lit": "v2018" }, { "lit": "today" }], "t": { "req": "`reqdata`", "res": "`body`" }, "index$": 2 }, { "a": true, "co": { "id": "GET /v2018/cities", "source": "openapi3", "version": 2 }, "g": { "query": [{ "a": true, "ex": "my.app.ch", "k": "query", "n": "app", "or": "app", "r": false, "t": "`$STRING`", "index$": 0 }, { "a": true, "ex": null, "k": "query", "n": "value", "or": "value", "r": false, "t": "`$STRING`", "index$": 1 }, { "a": true, "ex": "1.0.42", "k": "query", "n": "version", "or": "version", "r": false, "t": "`$STRING`", "index$": 2 }] }, "k": "http", "m": "GET", "o": "/v2018/cities", "q": { "$action": "city", "exist": ["app", "value", "version"] }, "r": {}, "s": [{ "lit": "v2018" }, { "lit": "cities" }], "t": { "req": "`reqdata`", "res": "`body`" }, "index$": 3 }, { "a": true, "co": { "id": "GET /v2018/widget", "source": "openapi3", "version": 2 }, "g": { "query": [{ "a": true, "ex": "my.app.ch", "k": "query", "n": "app", "or": "app", "r": false, "t": "`$STRING`", "index$": 0 }, { "a": true, "ex": null, "k": "query", "n": "value", "or": "value", "r": false, "t": "`$STRING`", "index$": 1 }, { "a": true, "ex": "1.0.42", "k": "query", "n": "version", "or": "version", "r": false, "t": "`$STRING`", "index$": 2 }] }, "k": "http", "m": "GET", "o": "/v2018/widget", "q": { "$action": "widget", "exist": ["app", "value", "version"] }, "r": {}, "s": [{ "lit": "v2018" }, { "lit": "widget" }], "t": { "req": "`reqdata`", "res": "`body`" }, "index$": 4 }], "key$": "load" } }, "relations": { "ancestors": [] }, "key$": "v2018", "name__orig": "v2018", "Name": "V2018", "name_": "v2018", "name-": "v2018", "NAME": "V2018", "index$": 2 }, { "active": true, "entity": "v2018", "key$": "BasicV2018Flow", "kind": "basic", "name": "BasicV2018Flow", "param": {}, "step": [{ "a": true, "d": {}, "i": { "ref": "v2018_ref01", "srcdatavar": "v2018_ref01_data", "suffix": "_dt0" }, "m": {}, "o": "load", "s": [], "v": [{ "apply": "TextFieldMark", "def": { "mark": "Mark01-v2018_ref01" } }], "index$": 0 }] }, 'V2018', { "GET /v2018/history": { "protocol": "http", "responses": { "200": { "description": "OK" } }, "parameters": [{ "name": "city", "in": "query", "description": "Orts-Identifikator aus der Ortsliste. (Hier obligatorisch.)", "schema": { "type": "string" }, "example": "bern", "required": true, "x-ref": "#/components/parameters/city_mandatory", "index$": 0 }, { "name": "start", "in": "query", "description": "Startdatum und -Zeit (UTC) in irgendeinem Format (ISO, Timestamp, yesterday, -1 day).", "schema": { "type": "string" }, "examples": { "Datum": { "value": "2025-01-01" }, "Vor einem Tag": { "value": "-1 day" }, "Zeitstempel": { "value": 1234567890 } }, "required": true, "x-ref": "#/components/parameters/startdate", "index$": 1 }, { "name": "end", "in": "query", "description": "Enddatum und -Zeit (UTC) in irgendeinem Format (ISO, Timestamp, now).", "schema": { "type": "string" }, "examples": { "Datum": { "value": "2025-02-13" }, "Jetzt": { "value": "now" }, "Zeitstempel": { "value": 1234567891 } }, "required": true, "x-ref": "#/components/parameters/enddate", "index$": 2 }, { "name": "app", "in": "query", "description": "Optionaler App-Name.", "schema": { "type": "string" }, "example": "my.app.ch", "x-ref": "#/components/parameters/app", "index$": 3 }, { "name": "version", "in": "query", "description": "Optionale Versionsnummer für diese App.", "schema": { "type": "string" }, "example": "1.0.42", "x-ref": "#/components/parameters/version", "index$": 4 }, { "name": "values", "in": "query", "description": "Optional kommata-separierte Wertenamen, adressiert mit gepunkteten Strings. Damit werden nur einzelne Werte (einer pro Zeile) extrahiert und die ganze Response als Text zurückgegeben.", "required": false, "schema": { "type": "string" }, "examples": { "none": { "value": null }, "Einzelner Wert": { "value": "aare.temperature", "description": "Einzelner Wert (Für Methode current)" }, "Mehrere Werte": { "value": "aare.temperature,aare.temperature_text,sun.sunlocations.0.timeleft", "description": "Mehrere Werte (Für Methode current)" } }, "x-ref": "#/components/parameters/values", "index$": 5 }], "securitySource": "unspecified" }, "GET /v2018/current": { "protocol": "http", "responses": { "200": { "description": "OK" } }, "parameters": [{ "name": "city", "in": "query", "description": "Orts-Identifikator aus der Ortsliste.", "schema": { "type": "string", "default": "bern" }, "example": "bern", "x-ref": "#/components/parameters/city", "index$": 0 }, { "name": "app", "in": "query", "description": "Optionaler App-Name.", "schema": { "type": "string" }, "example": "my.app.ch", "x-ref": "#/components/parameters/app", "index$": 1 }, { "name": "version", "in": "query", "description": "Optionale Versionsnummer für diese App.", "schema": { "type": "string" }, "example": "1.0.42", "x-ref": "#/components/parameters/version", "index$": 2 }, { "name": "values", "in": "query", "description": "Optional kommata-separierte Wertenamen, adressiert mit gepunkteten Strings. Damit werden nur einzelne Werte (einer pro Zeile) extrahiert und die ganze Response als Text zurückgegeben.", "required": false, "schema": { "type": "string" }, "examples": { "none": { "value": null }, "Einzelner Wert": { "value": "aare.temperature", "description": "Einzelner Wert (Für Methode current)" }, "Mehrere Werte": { "value": "aare.temperature,aare.temperature_text,sun.sunlocations.0.timeleft", "description": "Mehrere Werte (Für Methode current)" } }, "x-ref": "#/components/parameters/values", "index$": 3 }], "securitySource": "unspecified" }, "GET /v2018/today": { "protocol": "http", "responses": { "200": { "description": "OK" } }, "parameters": [{ "name": "city", "in": "query", "description": "Orts-Identifikator aus der Ortsliste.", "schema": { "type": "string", "default": "bern" }, "example": "bern", "x-ref": "#/components/parameters/city", "index$": 0 }, { "name": "app", "in": "query", "description": "Optionaler App-Name.", "schema": { "type": "string" }, "example": "my.app.ch", "x-ref": "#/components/parameters/app", "index$": 1 }, { "name": "version", "in": "query", "description": "Optionale Versionsnummer für diese App.", "schema": { "type": "string" }, "example": "1.0.42", "x-ref": "#/components/parameters/version", "index$": 2 }, { "name": "values", "in": "query", "description": "Optional kommata-separierte Wertenamen, adressiert mit gepunkteten Strings. Damit werden nur einzelne Werte (einer pro Zeile) extrahiert und die ganze Response als Text zurückgegeben.", "required": false, "schema": { "type": "string" }, "examples": { "none": { "value": null }, "Einzelner Wert": { "value": "aare.temperature", "description": "Einzelner Wert (Für Methode current)" }, "Mehrere Werte": { "value": "aare.temperature,aare.temperature_text,sun.sunlocations.0.timeleft", "description": "Mehrere Werte (Für Methode current)" } }, "x-ref": "#/components/parameters/values", "index$": 3 }], "securitySource": "unspecified" }, "GET /v2018/cities": { "protocol": "http", "responses": { "200": { "description": "OK" } }, "parameters": [{ "name": "app", "in": "query", "description": "Optionaler App-Name.", "schema": { "type": "string" }, "example": "my.app.ch", "x-ref": "#/components/parameters/app", "index$": 0 }, { "name": "version", "in": "query", "description": "Optionale Versionsnummer für diese App.", "schema": { "type": "string" }, "example": "1.0.42", "x-ref": "#/components/parameters/version", "index$": 1 }, { "name": "values", "in": "query", "description": "Optional kommata-separierte Wertenamen, adressiert mit gepunkteten Strings. Damit werden nur einzelne Werte (einer pro Zeile) extrahiert und die ganze Response als Text zurückgegeben.", "required": false, "schema": { "type": "string" }, "examples": { "none": { "value": null }, "Einzelner Wert": { "value": "aare.temperature", "description": "Einzelner Wert (Für Methode current)" }, "Mehrere Werte": { "value": "aare.temperature,aare.temperature_text,sun.sunlocations.0.timeleft", "description": "Mehrere Werte (Für Methode current)" } }, "x-ref": "#/components/parameters/values", "index$": 2 }], "securitySource": "unspecified" }, "GET /v2018/widget": { "protocol": "http", "responses": { "200": { "description": "OK" } }, "parameters": [{ "name": "app", "in": "query", "description": "Optionaler App-Name.", "schema": { "type": "string" }, "example": "my.app.ch", "x-ref": "#/components/parameters/app", "index$": 0 }, { "name": "version", "in": "query", "description": "Optionale Versionsnummer für diese App.", "schema": { "type": "string" }, "example": "1.0.42", "x-ref": "#/components/parameters/version", "index$": 1 }, { "name": "values", "in": "query", "description": "Optional kommata-separierte Wertenamen, adressiert mit gepunkteten Strings. Damit werden nur einzelne Werte (einer pro Zeile) extrahiert und die ganze Response als Text zurückgegeben.", "required": false, "schema": { "type": "string" }, "examples": { "none": { "value": null }, "Einzelner Wert": { "value": "aare.temperature", "description": "Einzelner Wert (Für Methode current)" }, "Mehrere Werte": { "value": "aare.temperature,aare.temperature_text,sun.sunlocations.0.timeleft", "description": "Mehrere Werte (Für Methode current)" } }, "x-ref": "#/components/parameters/values", "index$": 2 }], "securitySource": "unspecified" } });
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