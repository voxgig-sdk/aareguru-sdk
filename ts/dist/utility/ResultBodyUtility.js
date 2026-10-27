"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resultBody = resultBody;
exports.unreadableBody = unreadableBody;
const PREVIEW_LENGTH = 160;
async function resultBody(ctx) {
    const response = ctx.response;
    const result = ctx.result;
    if (result) {
        if (response && response.json && null != response.body) {
            try {
                const json = await response.json();
                result.body = json;
            }
            catch (err) {
                if ('SyntaxError' !== err?.name) {
                    throw err;
                }
                result.err = unreadableBody(ctx, {
                    status: result.status, headers: result.headers, text: err.text,
                    sent: ctx.spec?.headers, failed: result.err,
                });
            }
        }
    }
    return result;
}
// A body that is not JSON. An HTTP failure keeps its own error, with the
// response described; otherwise the code tells a wrong content type from
// malformed JSON.
function unreadableBody(ctx, res) {
    const type = headerValue(res.headers, 'content-type');
    const detail = 'HTTP ' + res.status + ', content-type ' + (type || 'none') +
        ', user-agent ' + (ctx.utility.clean(ctx, headerValue(res.sent, 'user-agent')) || 'transport default') +
        (null == res.text ? '' : ', body: ' + preview(ctx, res.text));
    if (null != res.failed) {
        res.failed.message += ' (' + detail + ')';
        return res.failed;
    }
    return '' === type || /json/i.test(type)
        ? ctx.error('response_json_invalid', 'response: body is not valid JSON (' + detail + ')')
        : ctx.error('response_content_type', 'response: expected JSON, got ' + type +
            ' (' + detail + ')');
}
function headerValue(headers, name) {
    if ('function' === typeof headers?.get) {
        return String(headers.get(name) ?? '');
    }
    for (const key of Object.keys(headers || {})) {
        if (name === key.toLowerCase()) {
            return String(headers[key]);
        }
    }
    return '';
}
// Cleaned whole: a secret the bound would split could leave its prefix.
function preview(ctx, text) {
    const flat = ctx.utility.clean(ctx, String(text).replace(/\s+/g, ' ').trim());
    return PREVIEW_LENGTH < flat.length ? flat.slice(0, PREVIEW_LENGTH) + '...' : flat;
}
//# sourceMappingURL=ResultBodyUtility.js.map