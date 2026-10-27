# Aareguru SDK utility: make_url

from __future__ import annotations
import re

from projectname_sdk.utility.voxgig_struct import voxgig_struct as vs


_PLACEHOLDER = re.compile(r"\{[^{}/]+\}")


def make_url_util(ctx):
    spec = ctx.spec
    result = ctx.result

    if spec is None:
        return "", ctx.make_error("url_no_spec",
            "Expected context spec property to be defined.")
    if result is None:
        return "", ctx.make_error("url_no_result",
            "Expected context result property to be defined.")

    url = vs.join([spec.base, spec.prefix, spec.path, spec.suffix], "/", True)
    resmatch = {}

    # Sent with the request, never recorded as the entity's match.
    authquery = getattr(spec, "authquery", None) or []

    # A route the definition ends with a slash keeps it, for a Django REST server,
    # and a host with no path takes /, or luasocket reads a query as the host.
    orig = vs.getprop(ctx.point, "orig") if ctx.point is not None else None
    if isinstance(orig, str) and orig.endswith("/") and not spec.suffix \
            and not url.endswith("/"):
        url += "/"
    authority = url.find("://")
    if 0 < authority and not any(c in url[authority + 3:] for c in "/?#"):
        url += "/"

    param_items = vs.items(spec.params)
    if param_items is not None:
        for item in param_items:
            key = item[0]
            val = item[1]
            if val is not None and isinstance(key, str):
                val_str = val if isinstance(val, str) else str(val)
                # A whole . or .. is a dot segment, which moves the request to another route.
                if val_str in (".", ".."):
                    return "", ctx.make_error("url_param_invalid",
                        "URL path parameter " + key + " cannot be \"" + val_str + "\".")
                encoded = vs.escurl(val_str)
                url = url.replace("{" + key + "}", encoded)
                resmatch[key] = val

    # A placeholder left in the route would send the request to the wrong route.
    # The base's own placeholders are server variables, resolved with the options.
    base = spec.base.rstrip("/") if isinstance(spec.base, str) else ""
    route = url[len(base):] if url.startswith(base) else url
    unfilled = _PLACEHOLDER.findall(route)
    if 0 < len(unfilled):
        return "", ctx.make_error("url_param_missing",
            "URL path has no value for " + ", ".join(unfilled) + ".")

    # Append query string from spec.query.
    qsep = "?"
    query_items = vs.items(getattr(spec, "query", None))
    if query_items is not None:
        for item in query_items:
            key = item[0]
            val = item[1]
            if val is not None and isinstance(key, str):
                val_str = val if isinstance(val, str) else str(val)
                url += qsep + vs.escurl(key) + "=" + vs.escurl(val_str)
                qsep = "&"
                if key not in authquery:
                    resmatch[key] = val

    result.resmatch = resmatch

    return url, None
