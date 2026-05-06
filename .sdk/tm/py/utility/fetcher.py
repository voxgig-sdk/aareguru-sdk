# Aareguru SDK utility: fetcher

from __future__ import annotations
import json
from utility.voxgig_struct import voxgig_struct as vs


def _default_http_fetch(fullurl, fetchdef):
    import urllib.request
    import urllib.error

    method = fetchdef.get("method", "GET")
    body_str = fetchdef.get("body")
    headers = fetchdef.get("headers", {})

    if not isinstance(body_str, str):
        body_str = None

    data = body_str.encode("utf-8") if body_str is not None else None

    req = urllib.request.Request(fullurl, data=data, method=method)
    for k, v in headers.items():
        req.add_header(k, v)

    try:
        resp = urllib.request.urlopen(req)
        body = resp.read().decode("utf-8")
        resp_headers = {}
        for k, v in resp.getheaders():
            resp_headers[k.lower()] = v

        json_body = None
        if len(body) > 0:
            try:
                json_body = json.loads(body)
            except Exception:
                pass

        status = resp.getcode()
        status_text = "OK" if status < 400 else "Error"

        return {
            "status": status,
            "statusText": status_text,
            "headers": resp_headers,
            "json": lambda: json_body,
            "body": body,
        }, None
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        resp_headers = {}
        for k, v in e.headers.items():
            resp_headers[k.lower()] = v

        json_body = None
        if len(body) > 0:
            try:
                json_body = json.loads(body)
            except Exception:
                pass

        status_text = "OK" if e.code < 400 else "Error"

        return {
            "status": e.code,
            "statusText": status_text,
            "headers": resp_headers,
            "json": lambda: json_body,
            "body": body,
        }, None
    except Exception as e:
        return None, str(e)


def fetcher_util(ctx, fullurl, fetchdef):
    if ctx.client.mode != "live":
        return None, ctx.make_error("fetch_mode_block",
            'Request blocked by mode: "' + ctx.client.mode +
            '" (URL was: "' + fullurl + '")')

    options = ctx.client.options_map()
    if vs.getpath(options, "feature.test.active") is True:
        return None, ctx.make_error("fetch_test_block",
            'Request blocked as test feature is active'
            ' (URL was: "' + fullurl + '")')

    sys_fetch = vs.getpath(options, "system.fetch")

    if sys_fetch is None:
        return _default_http_fetch(fullurl, fetchdef)

    if callable(sys_fetch):
        return sys_fetch(fullurl, fetchdef)

    return None, ctx.make_error("fetch_invalid", "system.fetch is not a valid function")
