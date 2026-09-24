# Typed models for the Aareguru SDK.
#
# GENERATED from the API model: main.kit.entity.<e>.fields{} and per-op
# params (op.<name>.points[].g.params[]). Field/param types come from the
# canonical type sentinels via @voxgig/sdkgen canonToType (source of truth:
# @voxgig/apidef VALID_CANON). Do not edit by hand.
#
# These are TypedDicts, not dataclasses: the SDK ops return/accept plain dicts
# at runtime, and a TypedDict IS a dict shape, so the types match the runtime.
# Optional (req:false) keys are modelled as TypedDict key-optionality
# (total=False), split into a required base + total=False subclass when a type
# has both required and optional keys.

from __future__ import annotations

from typing import TypedDict, Any


class Legacy(TypedDict):
    pass


class LegacyLoadMatch(TypedDict, total=False):
    app: str
    version: str


class Stuff(TypedDict):
    pass


class StuffLoadMatchRequired(TypedDict):
    service: str


class StuffLoadMatch(StuffLoadMatchRequired, total=False):
    app: str
    line: int
    version: str


class V2018(TypedDict):
    pass


class V2018LoadMatchRequired(TypedDict):
    city: str
    end: str
    start: str


class V2018LoadMatch(V2018LoadMatchRequired, total=False):
    app: str
    value: str
    version: str
