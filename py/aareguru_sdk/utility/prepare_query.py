# Aareguru SDK utility: prepare_query

from __future__ import annotations
from aareguru_sdk.utility.voxgig_struct import voxgig_struct as vs


def _contains_param(params, s):
    for v in params:
        if isinstance(v, str) and v == s:
            return True
    return False


def prepare_query_util(ctx):
    point = ctx.point
    reqmatch = ctx.reqmatch or {}

    params = []
    if point is not None:
        p = vs.getprop(point, "params")
        if isinstance(p, list):
            params = list(p)
        # A path parameter travels in the path. The generated config lists
        # them as args.params, which prepare_params reads; params is the
        # older list of names.
        pl = vs.getpath(point, "args.params")
        if isinstance(pl, list):
            for pd in pl:
                name = vs.getprop(pd, "name")
                if isinstance(name, str):
                    params.append(name)
        # A header parameter travels in the headers, which prepare_headers
        # fills.
        hl = vs.getpath(point, "args.header")
        if isinstance(hl, list):
            for hd in hl:
                name = vs.getprop(hd, "name")
                if isinstance(name, str):
                    params.append(name)

    # A query parameter travels under the name the definition gives it, its
    # orig, which the model may have renamed for the caller.
    wire = {}
    if point is not None:
        ql = vs.getpath(point, "args.query")
        if isinstance(ql, list):
            for qd in ql:
                name = vs.getprop(qd, "name")
                orig = vs.getprop(qd, "orig")
                if isinstance(name, str) and isinstance(orig, str) and orig != "":
                    wire[name] = orig

    out = {}
    reqmatch_items = vs.items(reqmatch)
    if reqmatch_items is not None:
        for item in reqmatch_items:
            key = item[0]
            val = item[1]
            if val is not None and isinstance(key, str) and key != "$action" \
                    and not _contains_param(params, key):
                out[wire.get(key, key)] = val

    return out
