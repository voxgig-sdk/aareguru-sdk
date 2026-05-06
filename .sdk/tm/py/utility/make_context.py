# Aareguru SDK utility: make_context

from core.context import AareguruContext


def make_context_util(ctxmap, basectx):
    return AareguruContext(ctxmap, basectx)
