# Aareguru SDK utility: result_body

import re


PREVIEW_LENGTH = 160


def result_body_util(ctx):
    response = ctx.response
    result = ctx.result

    if result is not None:
        if response is not None and response.json_func is not None and response.body is not None:
            json_data = response.json_func()
            result.body = json_data
        if response is not None and getattr(response, "unreadable", False):
            sent = ctx.spec.headers if ctx.spec is not None else None
            result.err = unreadable_body(ctx, result.status, result.headers, response.body,
                                         sent, result.err)

    return result


# A body that is not JSON. An HTTP failure keeps its own error, with the
# response described; otherwise the code tells a wrong content type from
# malformed JSON.
def unreadable_body(ctx, status, headers, text, sent, failed):
    ctype = _header_value(headers, "content-type")
    agent = ctx.utility.clean(ctx, _header_value(sent, "user-agent")) or "transport default"
    detail = ("HTTP " + str(status) + ", content-type " + (ctype or "none") +
              ", user-agent " + str(agent) +
              ("" if text is None else ", body: " + _preview(ctx, text)))

    if failed is not None:
        if isinstance(failed, str):
            return failed + " (" + detail + ")"
        message = str(failed) + " (" + detail + ")"
        if hasattr(failed, "msg"):
            failed.msg = message
        failed.args = (message,)
        return failed

    if "" == ctype or "json" in ctype.lower():
        return ctx.make_error("response_json_invalid",
                              "response: body is not valid JSON (" + detail + ")")
    return ctx.make_error("response_content_type",
                          "response: expected JSON, got " + ctype + " (" + detail + ")")


def _header_value(headers, name):
    if not isinstance(headers, dict):
        return ""
    for key, val in headers.items():
        if name == str(key).lower():
            return str(val)
    return ""


# Cleaned whole: a secret the bound would split could leave its prefix.
def _preview(ctx, text):
    flat = ctx.utility.clean(ctx, re.sub(r"\s+", " ", str(text)).strip())
    flat = str(flat)
    return flat[:PREVIEW_LENGTH] + "..." if len(flat) > PREVIEW_LENGTH else flat
