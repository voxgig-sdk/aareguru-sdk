# Aareguru SDK utility: prepare_query

from __future__ import annotations
from projectname_sdk.utility.voxgig_struct import voxgig_struct as vs
from projectname_sdk.utility.param import call_args


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
        # A header or cookie parameter travels in the headers, which
        # prepare_headers fills, unless a query parameter shares its name:
        # then both are sent.
        ql = vs.getpath(point, "args.query")
        declared = [vs.getprop(qd, "name") for qd in ql] if isinstance(ql, list) else []
        for located in (vs.getpath(point, "args.header"), vs.getpath(point, "args.cookie")):
            if isinstance(located, list):
                for hd in located:
                    name = vs.getprop(hd, "name")
                    if isinstance(name, str) and name not in declared:
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

    # A create or update passes its query arguments in its data.
    for name, orig, val in call_args(ctx, "query"):
        if val is not None and not _contains_param(params, name):
            out[orig] = val

    return out
