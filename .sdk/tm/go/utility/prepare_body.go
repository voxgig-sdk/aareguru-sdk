package utility

import "GOMODULE/core"

func prepareBodyUtil(ctx *core.Context) any {
	op := ctx.Op

	if op.Input == "data" {
		if isRawRequest(ctx.Point) {
			return rawBody(ctx.Reqdata)
		}
		body := ctx.Utility.TransformRequest(ctx)
		return body
	}

	return nil
}
