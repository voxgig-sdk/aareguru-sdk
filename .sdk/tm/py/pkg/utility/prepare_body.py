# Aareguru SDK utility: prepare_body

from projectname_sdk.utility.media import is_raw_request, raw_body


def prepare_body_util(ctx):
    op = ctx.op

    if op.input == "data":
        if is_raw_request(ctx.point):
            return raw_body(ctx.reqdata)
        body = ctx.utility.transform_request(ctx)
        return body

    return None
