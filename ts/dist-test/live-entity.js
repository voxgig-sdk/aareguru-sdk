"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runLiveEntity = runLiveEntity;
const strict_1 = __importDefault(require("node:assert/strict"));
const live_contract_1 = require("./live-contract");
const live_runner_1 = require("./live-runner");
const utility_1 = require("./utility");
const routeOf = (point) => String(point.m).toUpperCase() + ' ' + point.o;
const scalarOf = (value) => ['string', 'number', 'boolean'].includes(typeof value) ? value : undefined;
// The offline flow keeps its deterministic fixture assertions. Live flows
// resolve real prerequisites per operation and collect failures until done.
// `excluded` names, by step id, the steps this run leaves out, and why.
async function runLiveEntity(setup, entity, flow, accessor, facts = {}, settle = {}, excluded = {}) {
    const { client, transport } = setup;
    // A step switched off only because the offline call reaches no route of
    // its operation still runs here, where each route's inputs are resolved.
    const steps = (flow.step || [])
        .filter((step) => false !== step.a || true === step.unreachable);
    const created = new Map();
    const listed = [];
    let listedEmpty = false;
    const recordFields = new Set(['id', entity.id?.field || 'id',
        ...Object.values(entity.fields || {}).map((field) => field?.n).filter(Boolean)]);
    const marks = new Map();
    const idField = entity.id?.field || 'id';
    const copy = (value) => JSON.parse(JSON.stringify(value ?? {}));
    const hasCreate = steps.some(step => step.o === 'create');
    const report = await (0, live_runner_1.runLiveSteps)(steps.map((step, index) => {
        const ref = step.i?.ref || entity.name + '_ref01';
        const op = step.o;
        const id = entity.name + '.' + op + '.' + index;
        const control = (0, utility_1.isControlSkipped)('entityOp', entity.name + '.' + op, 'live');
        return {
            id,
            cleanup: op === 'remove' || (step.v || []).some((v) => v.apply === 'ItemNotExists'),
            excluded: control.skip ? control.reason || 'Excluded by test control' : excluded[id],
            run: async (context) => {
                transport.enter(context);
                const points = (entity.op?.[op]?.points || []).filter((point) => false !== point.a);
                if (!points.length)
                    throw new live_runner_1.LiveBlocked('No modelled operation point');
                const record = created.get(ref);
                // A failed create must not turn a later update/remove into a write
                // against an arbitrary record found by a list operation.
                if ((op === 'update' || op === 'remove') && hasCreate && !record) {
                    throw new live_runner_1.LiveBlocked('Create did not provide a usable resource');
                }
                if (op === 'remove' && !record)
                    throw new live_runner_1.LiveBlocked('No resource created by this run');
                if (op === 'remove' && !entity.id)
                    throw new live_runner_1.LiveBlocked('No modelled resource identity for cleanup');
                if (record && ['update', 'remove'].includes(op) && entity.id &&
                    null == (record[idField] ?? record.id)) {
                    throw new live_runner_1.LiveBlocked('Created resource has no usable identity');
                }
                let input = op === 'create'
                    ? copy(setup.data.new?.[entity.name]?.[ref]) : {};
                for (const [name, binding] of Object.entries({ ...step.m, ...step.d })) {
                    const value = setup.idmap[binding] ?? setup.idmap[name];
                    if (undefined !== value)
                        input[name] = value;
                }
                const loaded = record || (op === 'load' ? listed[0] : undefined);
                if (loaded && ['load', 'update', 'remove'].includes(op)) {
                    const id = loaded[idField] ?? loaded.id;
                    if (undefined !== id)
                        input.id = id;
                }
                // A load of a known record takes the route the offline flow takes,
                // and the parameters that flow reads from the record.
                for (const [name, field] of Object.entries(step.record || {})) {
                    const value = scalarOf(loaded?.[field]);
                    if (undefined !== value)
                        input[name] = value;
                }
                const ordered = null == step.route ? points : [...points].sort((a, b) => Number(step.route !== routeOf(a)) - Number(step.route !== routeOf(b)));
                // A nested route needing a parent id must not hide an available
                // parameter-free route for the same operation. Use the first viable
                // candidate. An action route is taken only when the step names its
                // action or the operation has no other route, and then by name.
                let resolved;
                let selected;
                const unusable = [];
                const actionOnly = points.every((point) => null != point.q?.$action);
                for (const point of ordered) {
                    const action = point.q?.$action;
                    if (null == input.$action ? null != action && !actionOnly : action !== input.$action)
                        continue;
                    const candidate = null == action ? { ...input } : { ...input, $action: action };
                    const missing = [];
                    const params = point.g?.params || [];
                    const query = (point.g?.query || []).filter((arg) => arg.r);
                    for (const arg of [...params, ...query]) {
                        if (undefined !== candidate[arg.n] && null !== candidate[arg.n])
                            continue;
                        const key = arg.n === 'id' ? entity.name + '01' : arg.n.replace(/_id$/, '') + '01';
                        const value = setup.idmap[key] ?? setup.idmap[arg.n] ?? scalarOf(loaded?.[arg.n]) ?? arg.ex;
                        if (undefined !== value && null !== value)
                            candidate[arg.n] = value;
                        else if (arg.r !== false)
                            missing.push(arg.n);
                    }
                    if (0 === missing.length) {
                        resolved = candidate;
                        selected = point;
                        break;
                    }
                    unusable.push({ route: null == action ? point.m + ' ' + point.o : '$action ' + action, missing });
                }
                if (!resolved) {
                    // An empty list is a valid answer: the account has no record to load.
                    if (op === 'load' && !record && listedEmpty &&
                        unusable.every(route => route.missing.every(name => recordFields.has(name)))) {
                        throw new live_runner_1.LiveEmpty('The account has no ' + entity.name + ' record to load');
                    }
                    throw new live_runner_1.LiveBlocked(0 === unusable.length ? 'No route for $action ' + input.$action :
                        'No usable route: ' + unusable.map(route => route.route + ' needs ' +
                            route.missing.join(', ')).join('; '));
                }
                input = resolved;
                if (op === 'create' && facts[selected.m + ' ' + selected.o]) {
                    const selectedFacts = facts[selected.m + ' ' + selected.o];
                    const request = (0, live_contract_1.requestContract)(selectedFacts);
                    if (request.schema)
                        input = { ...(0, live_contract_1.synthesizeInput)(request.schema, selected.li?.input ?? request.example) };
                    else if (selectedFacts.protocol === 'http')
                        input = {};
                    for (const arg of selected.g?.params || [])
                        if (resolved[arg.n] !== undefined)
                            input[arg.n] = resolved[arg.n];
                    if (undefined !== resolved.$action)
                        input.$action = resolved.$action;
                }
                let intendedMark;
                if (op === 'update') {
                    for (const spec of step.s || []) {
                        if (spec.apply === 'TextFieldMark' && step.i?.textfield) {
                            const mark = { name: step.i.textfield, value: spec.def.mark + '_' + setup.now };
                            input[mark.name] = mark.value;
                            intendedMark = mark;
                        }
                    }
                }
                // A fresh entity prevents state left by a failed operation from
                // changing the request for the next independent operation.
                const result = await client[accessor]()[op](input);
                if (intendedMark)
                    marks.set(ref, intendedMark);
                if (op === 'list') {
                    (0, strict_1.default)(Array.isArray(result), 'Expected a list of entity instances');
                    const data = result.map((item) => {
                        strict_1.default.equal(typeof item?.data, 'function');
                        return item.data();
                    });
                    listed.splice(0, listed.length, ...data);
                    listedEmpty = 0 === data.length;
                    context.publish(data);
                    for (const validation of step.v || []) {
                        const previous = created.get(validation.def?.ref);
                        const id = previous?.[idField] ?? previous?.id;
                        if (undefined === id)
                            continue;
                        const found = data.some((item) => (item?.[idField] ?? item?.id) === id);
                        if (validation.apply === 'ItemExists')
                            (0, strict_1.default)(found, 'Created resource missing from list');
                        if (validation.apply === 'ItemNotExists')
                            (0, strict_1.default)(!found, 'Removed resource still in list');
                    }
                }
                else {
                    strict_1.default.equal(typeof result?.data, 'function', 'Expected an entity instance');
                    const data = result.data();
                    (0, strict_1.default)(null != data, 'Expected operation data');
                    // Publish before assertion checks: cleanup still needs the id
                    // when the server created a resource with incorrect field values.
                    if (op === 'create')
                        created.set(ref, data);
                    context.publish(data);
                    if (op === 'create' && entity.id)
                        (0, strict_1.default)(null != (data[idField] ?? data.id), 'Missing created identity');
                    if (['load', 'update'].includes(op) && input.id != null && entity.id) {
                        strict_1.default.equal(data[idField] ?? data.id, input.id, 'Response identity mismatch');
                    }
                    const mark = marks.get(ref);
                    if (mark && ['update', 'load'].includes(op)) {
                        strict_1.default.equal(data[mark.name], mark.value, 'Updated field mismatch');
                    }
                }
            },
        };
    }), {
        delayMs: (0, utility_1.liveDelayMs)(),
        report: result => console.log('LIVE STEP ' + JSON.stringify(result)),
    });
    console.log('LIVE SUMMARY ' + JSON.stringify({ entity: entity.name, ...report }));
    (0, live_runner_1.settleLiveReport)(report, settle);
}
//# sourceMappingURL=live-entity.js.map