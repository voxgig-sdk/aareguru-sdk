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
(0, node_test_1.describe)('LegacyEntity', async () => {
    // Per-test live pacing. Delay is read from sdk-test-control.json's
    // `test.live.delayMs`; only sleeps when AAREGURU_TEST_LIVE=TRUE.
    (0, node_test_1.afterEach)((0, utility_1.liveDelay)('AAREGURU_TEST_LIVE'));
    (0, node_test_1.test)('instance', async () => {
        const testsdk = __1.AareguruSDK.test();
        const ent = testsdk.Legacy();
        (0, node_assert_1.default)(null != ent);
    });
    (0, node_test_1.test)('basic', async (t) => {
        const live = 'TRUE' === process.env.AAREGURU_TEST_LIVE;
        for (const op of ['load']) {
            if (!live && (0, utility_1.maybeSkipControl)(t, 'entityOp', 'legacy.' + op, live))
                return;
        }
        const setup = basicSetup();
        if (setup.live) {
            return (0, live_entity_1.runLiveEntity)(setup, { "active": true, "alias": { "field": {} }, "fields": [], "name": "legacy", "op": { "load": { "input": "data", "name": "load", "points": [{ "active": true, "args": { "query": [{ "active": true, "example": "my.app.ch", "kind": "query", "name": "app", "orig": "app", "reqd": false, "type": "`$STRING`", "index$": 0 }, { "active": true, "example": "1.0.42", "kind": "query", "name": "version", "orig": "version", "reqd": false, "type": "`$STRING`", "index$": 1 }] }, "contract": { "id": "GET /current", "json": "{\"parameters\":[{\"description\":\"Optionaler App-Name.\",\"example\":\"my.app.ch\",\"in\":\"query\",\"name\":\"app\",\"schema\":{\"type\":\"string\"}},{\"description\":\"Optionale Versionsnummer für diese App.\",\"example\":\"1.0.42\",\"in\":\"query\",\"name\":\"version\",\"schema\":{\"type\":\"string\"}}],\"protocol\":\"http\",\"responses\":{\"200\":{\"description\":\"OK\"}},\"securitySource\":\"unspecified\"}", "source": "openapi3", "version": 1 }, "kind": "http", "method": "GET", "orig": "/current", "segments": [{ "lit": "current" }], "select": { "exist": ["app", "version"] }, "transform": { "req": "`reqdata`", "res": "`body`" }, "index$": 0 }, { "active": true, "args": { "query": [{ "active": true, "example": "my.app.ch", "kind": "query", "name": "app", "orig": "app", "reqd": false, "type": "`$STRING`", "index$": 0 }, { "active": true, "example": "1.0.42", "kind": "query", "name": "version", "orig": "version", "reqd": false, "type": "`$STRING`", "index$": 1 }] }, "contract": { "id": "GET /currentV2", "json": "{\"parameters\":[{\"description\":\"Optionaler App-Name.\",\"example\":\"my.app.ch\",\"in\":\"query\",\"name\":\"app\",\"schema\":{\"type\":\"string\"}},{\"description\":\"Optionale Versionsnummer für diese App.\",\"example\":\"1.0.42\",\"in\":\"query\",\"name\":\"version\",\"schema\":{\"type\":\"string\"}}],\"protocol\":\"http\",\"responses\":{\"200\":{\"description\":\"OK\"}},\"securitySource\":\"unspecified\"}", "source": "openapi3", "version": 1 }, "kind": "http", "method": "GET", "orig": "/currentV2", "segments": [{ "lit": "currentV2" }], "select": { "exist": ["app", "version"] }, "transform": { "req": "`reqdata`", "res": "`body`" }, "index$": 1 }, { "active": true, "args": { "query": [{ "active": true, "example": "my.app.ch", "kind": "query", "name": "app", "orig": "app", "reqd": false, "type": "`$STRING`", "index$": 0 }, { "active": true, "example": "1.0.42", "kind": "query", "name": "version", "orig": "version", "reqd": false, "type": "`$STRING`", "index$": 1 }] }, "contract": { "id": "GET /today", "json": "{\"parameters\":[{\"description\":\"Optionaler App-Name.\",\"example\":\"my.app.ch\",\"in\":\"query\",\"name\":\"app\",\"schema\":{\"type\":\"string\"}},{\"description\":\"Optionale Versionsnummer für diese App.\",\"example\":\"1.0.42\",\"in\":\"query\",\"name\":\"version\",\"schema\":{\"type\":\"string\"}}],\"protocol\":\"http\",\"responses\":{\"200\":{\"description\":\"OK\"}},\"securitySource\":\"unspecified\"}", "source": "openapi3", "version": 1 }, "kind": "http", "method": "GET", "orig": "/today", "segments": [{ "lit": "today" }], "select": { "exist": ["app", "version"] }, "transform": { "req": "`reqdata`", "res": "`body`" }, "index$": 2 }], "key$": "load" } }, "relations": { "ancestors": [] }, "key$": "legacy", "name__orig": "legacy", "Name": "Legacy", "name_": "legacy", "name-": "legacy", "NAME": "LEGACY", "index$": 0 }, { "active": true, "entity": "legacy", "key$": "BasicLegacyFlow", "kind": "basic", "name": "BasicLegacyFlow", "param": {}, "step": [{ "active": true, "data": {}, "input": { "ref": "legacy_ref01", "srcdatavar": "legacy_ref01_data", "suffix": "_dt0" }, "match": {}, "op": "load", "spec": [], "valid": [{ "apply": "TextFieldMark", "def": { "mark": "Mark01-legacy_ref01" } }], "index$": 0 }] }, 'Legacy');
        }
        const client = setup.client;
        const struct = setup.struct;
        const isempty = struct.isempty;
        const select = struct.select;
        let legacy_ref01_data = Object.values(setup.data.existing.legacy)[0];
        // LOAD
        const legacy_ref01_ent = client.Legacy();
        const legacy_ref01_match_dt0 = {};
        const legacy_ref01_data_dt0 = (await legacy_ref01_ent.load(legacy_ref01_match_dt0)).data();
        (0, node_assert_1.default)(null != legacy_ref01_data_dt0);
    });
});
function basicSetup(extra) {
    // TODO: fix test def options
    const options = {}; // null
    // TODO: needs test utility to resolve path
    const entityDataFile = node_path_1.default.resolve(__dirname, '../../../../.sdk/test/entity/legacy/LegacyTestData.json');
    // TODO: file ready util needed?
    const entityDataSource = Fs.readFileSync(entityDataFile).toString('utf8');
    // TODO: need a xlang JSON parse utility in voxgig/struct with better error msgs
    const entityData = JSON.parse(entityDataSource);
    options.entity = entityData.existing;
    let client = __1.AareguruSDK.test(options, extra);
    const struct = client.utility().struct;
    const merge = struct.merge;
    const transform = struct.transform;
    let idmap = transform(['legacy01', 'legacy02', 'legacy03'], {
        '`$PACK`': ['', {
                '`$KEY`': '`$COPY`',
                '`$VAL`': ['`$FORMAT`', 'upper', '`$COPY`']
            }]
    });
    const env = (0, utility_1.envOverride)({
        'AAREGURU_TEST_LEGACY_ENTID': idmap,
        'AAREGURU_TEST_LIVE': 'FALSE',
        'AAREGURU_TEST_EXPLAIN': 'FALSE',
    });
    idmap = env['AAREGURU_TEST_LEGACY_ENTID'];
    const live = 'TRUE' === env.AAREGURU_TEST_LIVE;
    const transport = (0, live_runner_1.createLiveTransport)();
    if (live) {
        const rawIds = process.env['AAREGURU_TEST_LEGACY_ENTID'];
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
//# sourceMappingURL=LegacyEntity.test.js.map