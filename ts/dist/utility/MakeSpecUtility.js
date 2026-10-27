"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeSpec = makeSpec;
const types_1 = require("../types");
const PrepareMethodUtility_1 = require("./PrepareMethodUtility");
function makeSpec(ctx) {
    // A PreSpec hook's rejection, which the pipeline raises; ctx.spec stays a spec.
    if (ctx.out.spec instanceof Error) {
        return ctx.out.spec;
    }
    if (ctx.out.spec) {
        return ctx.spec = ctx.out.spec;
    }
    const point = ctx.point;
    const options = ctx.options;
    const utility = ctx.utility;
    const prepareMethod = utility.prepareMethod;
    const prepareParams = utility.prepareParams;
    const prepareQuery = utility.prepareQuery;
    const prepareHeaders = utility.prepareHeaders;
    const prepareBody = utility.prepareBody;
    const preparePath = utility.preparePath;
    const prepareAuth = utility.prepareAuth;
    ctx.spec = new types_1.Spec({
        base: options.base, // string, URL endpoint base prefix,
        prefix: options.prefix,
        parts: point.parts,
        suffix: options.suffix,
        step: 'start',
    });
    ctx.spec.method = prepareMethod(ctx);
    if (!(0, PrepareMethodUtility_1.allowed)(options.allow.method, ctx.spec.method)) {
        return ctx.error('spec_method_allow', 'Method "' + ctx.spec.method +
            '" not allowed by SDK option allow.method value: "' + options.allow.method + '"');
    }
    ctx.spec.params = prepareParams(ctx);
    ctx.spec.query = prepareQuery(ctx);
    ctx.spec.headers = prepareHeaders(ctx);
    if ('graphql' === point.kind) {
        ctx.spec.body = utility.graphqlBody(ctx);
        ctx.spec.path = '';
        // The match arguments prepareQuery copied here travel as operation
        // variables; sent twice, they would also leak into the URL.
        ctx.spec.query = {};
        ctx.spec.headers['content-type'] = utility.GRAPHQL_CONTENT_TYPE;
    }
    else {
        ctx.spec.body = prepareBody(ctx);
        ctx.spec.path = preparePath(ctx);
    }
    if (ctx.ctrl.explain) {
        ctx.ctrl.explain.spec = ctx.spec;
    }
    // Whatever prepareAuth sets in the query, under whichever name, is the
    // credential; a key it leaves as it was is the caller's.
    const query = { ...ctx.spec.query };
    const spec = prepareAuth(ctx);
    if (!(spec instanceof Error)) {
        spec.authquery = Object.keys(spec.query || {})
            .filter((key) => spec.query[key] !== query[key]);
        ctx.spec = spec;
    }
    return spec;
}
//# sourceMappingURL=MakeSpecUtility.js.map