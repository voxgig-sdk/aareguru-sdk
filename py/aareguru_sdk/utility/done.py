# Aareguru SDK utility: done


def done_util(ctx):
    clean_explain_util(ctx)

    if ctx.result is not None and ctx.result.ok:
        return ctx.result.resdata

    # make_error raises on the default (throw) path; only returns bare
    # resdata when throw_err is explicitly disabled.
    return ctx.utility.make_error(ctx, None)


# In place: the caller holds this very dict (ctrl is built from it), and a
# stream copies only its ctrl, so a reassignment would leave the raw record
# in their hands.
def clean_explain_util(ctx):
    explain = ctx.ctrl.explain
    if not isinstance(explain, dict):
        return
    cleaned = ctx.utility.clean(ctx, explain)
    if isinstance(cleaned, dict) and cleaned is not explain:
        explain.clear()
        explain.update(cleaned)
    # With clean off, explain.result is the live result object, not a dict.
    result = explain.get("result")
    if isinstance(result, dict):
        explain["result"] = {k: v for k, v in result.items() if k != "err"}
