# Aareguru SDK utility: transform_request

from __future__ import annotations
from aareguru_sdk.utility.voxgig_struct import voxgig_struct as vs
from aareguru_sdk.core.helpers import to_map


# `$action` selects the point (see make_point_util); it is never an API field,
# so the body is a copy without it. The caller's dict is left untouched.
def _strip_action(reqdata):
    return _omit(reqdata, ["$action"])


# A header argument travels as a header, which prepare_headers_util sends, so
# the body is built from the request data without it.
def _header_arg_names(point):
    hl = vs.getpath(point, "args.header") if point is not None else None
    if not isinstance(hl, list):
        return []
    names = [vs.getprop(hd, "name") for hd in hl]
    return [n for n in names if isinstance(n, str) and n != ""]


def _omit(reqdata, names):
    if not isinstance(reqdata, dict) or not any(n in reqdata for n in names):
        return reqdata
    return {k: v for k, v in reqdata.items() if k not in names}


def transform_request_util(ctx):
    spec = ctx.spec
    point = ctx.point

    if spec is not None:
        spec.step = "reqform"

    data = _omit(ctx.reqdata, _header_arg_names(point))

    transform = to_map(vs.getprop(point, "transform"))
    if transform is None:
        return _strip_action(data)

    reqform = vs.getprop(transform, "req")
    if reqform is None:
        return _strip_action(data)

    reqdata = vs.transform({
        "reqdata": data,
    }, reqform)

    return _strip_action(reqdata)
