import { Context } from '../types';
declare function param(ctx: Context, paramdef: any): any;
declare function paramValue(ctx: Context, point: any, key: string): any;
type CallArg = {
    name: string;
    wire: string;
    val: any;
};
declare function callArgs(ctx: Context, kind: string): CallArg[];
export { param, paramValue, callArgs, };
