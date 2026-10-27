"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makePoint = makePoint;
const ParamUtility_1 = require("./ParamUtility");
const PrepareMethodUtility_1 = require("./PrepareMethodUtility");
function terminalParam(point) {
    const parts = point.parts;
    const last = 0 < parts.length ? parts[parts.length - 1] : '';
    return 'string' === typeof last && 0 === last.indexOf('{');
}
function ownPoint(points) {
    let best = points[0];
    for (const cand of points) {
        const candterm = terminalParam(cand);
        const bestterm = terminalParam(best);
        if (candterm !== bestterm ? candterm :
            cand.parts.length < best.parts.length) {
            best = cand;
        }
    }
    return best;
}
// The path parameters of a point that neither the call nor the entity gives a
// value for, looked up as prepareParams looks them up.
function unfilled(ctx, point) {
    const missing = [];
    for (const part of (point.parts || [])) {
        const name = /^\{([^{}\/]+)\}$/.exec(String(part))?.[1];
        if (null != name && null == (0, ParamUtility_1.paramValue)(ctx, point, name)) {
            missing.push(name);
        }
    }
    return missing;
}
function makePoint(ctx) {
    if (ctx.out.point) {
        return ctx.point = ctx.out.point;
    }
    const getprop = ctx.utility.struct.getprop;
    const op = ctx.op;
    const options = ctx.options;
    if (!(0, PrepareMethodUtility_1.allowed)(options.allow.op, op.name)) {
        return ctx.error('point_op_allow', 'Operation "' + op.name +
            '" not allowed by SDK option allow.op value: "' + options.allow.op + '"');
    }
    if (0 === op.points.length) {
        return ctx.error('point_no_points', 'Operation "' + op.name + '" has no endpoint definitions.');
    }
    // Choose the appropriate point based on the match or data.
    if (1 === op.points.length) {
        ctx.point = op.points[0];
    }
    else {
        // Operation argument has priority, but also look in current data or match.
        const reqselector = getprop(ctx, 'req' + op.input);
        const selector = getprop(ctx, op.input);
        let point;
        let matched = false;
        for (let i = 0; i < op.points.length; i++) {
            const cand = op.points[i];
            const select = cand.select;
            let found = true;
            if (selector && select.exist) {
                for (let j = 0; j < select.exist.length; j++) {
                    const existkey = select.exist[j];
                    if (undefined === getprop(reqselector, existkey)
                        && undefined === getprop(selector, existkey)) {
                        found = false;
                        break;
                    }
                }
            }
            // Action is only in operation argument.
            if (found && reqselector.$action !== select.$action) {
                found = false;
            }
            if (found) {
                point = cand;
                matched = true;
                break;
            }
        }
        if (!matched) {
            if (null != reqselector.$action) {
                return ctx.error('point_action_invalid', 'Operation "' + op.name +
                    '" action "' + reqselector.$action + '" is not valid.');
            }
            // A call without an action falls back to a point without one, as
            // generation does, and only to a route the call can fill.
            const plain = op.points.filter((cand) => null == cand.select?.$action);
            if (0 === plain.length) {
                return ctx.error('point_action_required', 'Operation "' + op.name +
                    '" has only action endpoints; pass $action to choose one.');
            }
            const fillable = plain.filter((cand) => 0 === unfilled(ctx, cand).length);
            if (0 === fillable.length) {
                return ctx.error('point_no_match', 'Operation "' + op.name +
                    '" has no endpoint whose path parameters are all given (missing: ' +
                    unfilled(ctx, ownPoint(plain)).join(', ') + ').');
            }
            point = ownPoint(fillable);
        }
        if (null != reqselector.$action &&
            null != point &&
            reqselector.$action !== point.select.$action) {
            return ctx.error('point_action_invalid', 'Operation "' + op.name +
                '" action "' + reqselector.$action + '" is not valid.');
        }
        ctx.point = point;
    }
    return ctx.point;
}
//# sourceMappingURL=MakePointUtility.js.map