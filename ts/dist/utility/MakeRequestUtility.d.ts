import { Context, Response } from '../types';
declare function makeRequest(ctx: Context): Promise<Response | Error>;
declare function abortError(ctx: Context, err: any): any;
export { abortError, makeRequest };
