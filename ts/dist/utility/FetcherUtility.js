"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_USER_AGENT = void 0;
exports.fetcher = fetcher;
// Several CDNs refuse a library's own agent, so outside a browser a request
// without one carries the browser-shaped agent most other targets send.
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (compatible; AareguruSDK/1.0)';
exports.DEFAULT_USER_AGENT = DEFAULT_USER_AGENT;
function defaultUserAgent(fetchdef) {
    if (null == globalThis.process?.versions?.node) {
        return;
    }
    const headers = fetchdef.headers = fetchdef.headers || {};
    for (const name of Object.keys(headers)) {
        if ('user-agent' === name.toLowerCase()) {
            return;
        }
    }
    headers['user-agent'] = DEFAULT_USER_AGENT;
}
const GETONLY_ENV = 'VOXGIG_GETONLY_GUARD';
// A GET-only live run refuses any other method before it is sent. The error
// names the path alone: the query can carry a credential.
function getOnlyRefusal(ctx, fullurl, fetchdef) {
    const method = String(fetchdef.method || 'GET').toUpperCase();
    if ('TRUE' !== globalThis.process?.env?.[GETONLY_ENV] || 'GET' === method) {
        return;
    }
    const scheme = fullurl.indexOf('://');
    const rest = scheme < 0 ? fullurl : fullurl.slice(scheme + 3).replace(/^[^/?#]*/, '');
    const path = rest.split(/[?#]/)[0] || '/';
    return ctx.error('fetch_getonly_block', '[GET-ONLY GUARD] blocked ' + method + ' ' + path);
}
// Make HTTP call using library. Replace this utility for mocking etc.
async function fetcher(ctx, fullurl, fetchdef) {
    if ('live' !== ctx.client._mode) {
        return ctx.error('fetch_mode_block', 'Request blocked by mode: "' + ctx.client._mode +
            '" (URL was: "' + fullurl + '")');
    }
    const options = ctx.client.options();
    const getpath = ctx.utility.struct.getpath;
    if (true === getpath(options, 'feature.test.active')) {
        return ctx.error('fetch_test_block', 'Request blocked as test feature is active' +
            ' (URL was: "' + fullurl + '")');
    }
    const fetch = options.system.fetch;
    // The platform's fetch is the SDK's own transport; a supplied one is the
    // caller's, and a mock sends nothing.
    const refused = fetch === globalThis.fetch ? getOnlyRefusal(ctx, fullurl, fetchdef) : undefined;
    if (refused) {
        return refused;
    }
    defaultUserAgent(fetchdef);
    const response = await fetch(fullurl, fetchdef);
    return response;
}
//# sourceMappingURL=FetcherUtility.js.map