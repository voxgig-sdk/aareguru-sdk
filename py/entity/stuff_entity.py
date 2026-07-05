# Aareguru SDK Stuff entity

from __future__ import annotations

from utility.voxgig_struct import voxgig_struct as vs
from core import helpers
from aareguru_types import (
    Stuff,
    StuffLoadMatch,
)


class StuffEntity:

    def __init__(self, client, entopts=None):
        if entopts is None:
            entopts = {}
        if "active" not in entopts:
            entopts["active"] = True
        elif entopts["active"] is False:
            pass  # keep false
        else:
            entopts["active"] = True

        self._name = "stuff"
        self._client = client
        self._utility = client.get_utility()
        self._entopts = entopts
        self._data = {}
        self._match = {}

        self._entctx = self._utility.make_context({
            "entity": self,
            "entopts": entopts,
        }, client.get_root_ctx())

        self._utility.feature_hook(self._entctx, "PostConstructEntity")

    def get_name(self):
        return self._name

    def make(self):
        opts = {}
        for k, v in self._entopts.items():
            opts[k] = v
        return StuffEntity(self._client, opts)

    def data_set(self, args=None):
        if args is not None:
            self._data = helpers.to_map(vs.clone(args)) or {}
            self._utility.feature_hook(self._entctx, "SetData")

    def data_get(self) -> Stuff:
        self._utility.feature_hook(self._entctx, "GetData")
        return vs.clone(self._data)

    def match_set(self, args=None):
        if args is not None:
            self._match = helpers.to_map(vs.clone(args)) or {}
            self._utility.feature_hook(self._entctx, "SetMatch")

    def match_get(self) -> Stuff:
        self._utility.feature_hook(self._entctx, "GetMatch")
        return vs.clone(self._match)

    
    def load(self, reqmatch=None, ctrl=None) -> Stuff:
        utility = self._utility
        # reqmatch is optional: an entity with no id-like key loads with no
        # match. Treat None as an empty match so client.Stuff().load()
        # works with no args.
        if reqmatch is None:
            reqmatch = {}
        ctx = utility.make_context({
            "opname": "load",
            "ctrl": ctrl,
            "match": self._match,
            "data": self._data,
            "reqmatch": reqmatch,
        }, self._entctx)

        def post_done():
            if ctx.result is not None:
                if ctx.result.resmatch is not None:
                    self._match = ctx.result.resmatch
                if ctx.result.resdata is not None:
                    self._data = helpers.to_map(vs.clone(ctx.result.resdata)) or {}

        return self._run_op(ctx, post_done)



    

    

    

    

    def _run_op(self, ctx, post_done):
        utility = self._utility

        # #PrePoint-Hook

        point, err = utility.make_point(ctx)
        ctx.out["point"] = point
        if err is not None:
            return utility.make_error(ctx, err)

        # #PreSpec-Hook

        spec, err = utility.make_spec(ctx)
        ctx.out["spec"] = spec
        if err is not None:
            return utility.make_error(ctx, err)

        # #PreRequest-Hook

        resp, err = utility.make_request(ctx)
        ctx.out["request"] = resp
        if err is not None:
            return utility.make_error(ctx, err)

        # #PreResponse-Hook

        resp2, err = utility.make_response(ctx)
        ctx.out["response"] = resp2
        if err is not None:
            return utility.make_error(ctx, err)

        # #PreResult-Hook

        result, err = utility.make_result(ctx)
        ctx.out["result"] = result
        if err is not None:
            return utility.make_error(ctx, err)

        # #PreDone-Hook

        post_done()

        return utility.done(ctx)
