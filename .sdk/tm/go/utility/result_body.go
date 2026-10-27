package utility

import "GOMODULE/core"

func resultBodyUtil(ctx *core.Context) *core.Result {
	response := ctx.Response
	result := ctx.Result

	if result != nil {
		if response != nil && response.JsonFunc != nil && response.Body != nil {
			json := response.JsonFunc()
			result.Body = json
		}
		if response != nil && response.Unreadable {
			var sent any
			if ctx.Spec != nil {
				sent = ctx.Spec.Headers
			}
			result.Err = core.UnreadableBody(ctx, result.Status, result.Headers, response.Body,
				sent, result.Err)
		}
	}

	return result
}
