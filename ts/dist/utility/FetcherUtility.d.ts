import { Context, Response } from '../types';
declare const DEFAULT_USER_AGENT = "Mozilla/5.0 (compatible; AareguruSDK/1.0)";
declare function fetcher(ctx: Context, fullurl: string, fetchdef: Record<string, any>): Promise<Response | Error>;
export { fetcher, DEFAULT_USER_AGENT, };
