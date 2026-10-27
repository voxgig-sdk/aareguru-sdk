# Aareguru SDK utility: media

# The media types a point declares: `response` (the model's `rs`) for the
# Accept header, and `body` (the model's `rb`) for the request body.

from __future__ import annotations
from aareguru_sdk.utility.voxgig_struct import voxgig_struct as vs


# The data key holding a raw request body. Like `$action`, it can never be a
# declared argument name.
RAW_BODY = "$body"


def is_json_media(media):
    m = str(media if media is not None else "").split(";")[0].strip().lower()
    return m == "application/json" or m == "text/json" or m.endswith("+json")


# The declared JSON type alone, else every declared type in the model's
# order; None when no success response declares a body.
def accept_of(point):
    res = vs.getprop(point, "response")
    media = vs.getprop(res, "media")
    if not isinstance(media, str) or media == "":
        return None
    if vs.getprop(res, "kind") == "json":
        return media
    types = [media]
    alts = vs.getprop(res, "alternatives")
    if isinstance(alts, list):
        for alt in alts:
            m = vs.getprop(alt, "media")
            if isinstance(m, str) and m != "":
                types.append(m)
    return ", ".join(types)


def is_raw_request(point):
    return vs.getpath(point, "body.kind") == "raw"


def is_json_request(point):
    return vs.getpath(point, "body.kind") == "json"


# Bytes or a file object go as given. A dict or a list is JSON, and so is a
# scalar on a point that declares a JSON body.
def request_body(point, body):
    if isinstance(body, (bytes, bytearray, memoryview)) or callable(getattr(body, "read", None)):
        return body
    if vs.isnode(body) or is_json_request(point):
        return vs.jsonify(body)
    return body


def _has_header(headers, name):
    return any(isinstance(k, str) and k.lower() == name for k in headers)


# A caller's accept wins. A declared request type replaces each JSON
# content-type, the SDK default, and leaves any other the caller set.
def media_headers(point, headers):
    accept = accept_of(point)
    if accept is not None and not _has_header(headers, "accept"):
        headers["accept"] = accept

    body = vs.getprop(point, "body")
    kind = vs.getprop(body, "kind")
    media = vs.getprop(body, "media")
    if kind in ("raw", "json") and isinstance(media, str) and media != "":
        for key in [k for k in headers if isinstance(k, str) and k.lower() == "content-type"
                    and is_json_media(headers[k])]:
            del headers[key]
        if not _has_header(headers, "content-type"):
            headers["content-type"] = media

    return headers


# Bytes, a file object or a string, sent as they are. A file object can be read
# once, so it is read here, before the first attempt, and a retry sends the
# same bytes again.
def raw_body(reqdata):
    body = reqdata.get(RAW_BODY) if isinstance(reqdata, dict) else None
    if body is not None and callable(getattr(body, "read", None)):
        return body.read()
    return body
