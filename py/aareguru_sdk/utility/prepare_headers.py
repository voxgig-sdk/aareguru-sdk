# Aareguru SDK utility: prepare_headers

from __future__ import annotations
from aareguru_sdk.utility.voxgig_struct import voxgig_struct as vs


def prepare_headers_util(ctx):
    options = ctx.client.options_map()
    headers = vs.getprop(options, "headers")

    out = {}
    if headers is not None:
        cloned = vs.clone(headers)
        if isinstance(cloned, dict):
            out = cloned

    # A header parameter travels as a header, under the name the definition
    # gives it, and only from this call's own arguments. It replaces a default
    # of the same name, whatever its case.
    hl = vs.getpath(ctx.point, "args.header") if ctx.point is not None else None
    if isinstance(hl, list):
        for hd in hl:
            name = vs.getprop(hd, "name")
            if not isinstance(name, str) or name == "":
                continue
            orig = vs.getprop(hd, "orig")
            if not isinstance(orig, str) or orig == "":
                orig = name
            val = vs.getprop(ctx.reqmatch or {}, name)
            if val is None:
                val = vs.getprop(ctx.reqdata or {}, name)
            if val is not None:
                wire = orig.lower()
                for key in [k for k in out if isinstance(k, str) and k.lower() == wire]:
                    del out[key]
                out[wire] = vs.stringify(val)

    return out
