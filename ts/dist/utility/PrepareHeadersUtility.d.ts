import { Context } from '../types';
declare function prepareHeaders(ctx: Context): Record<string, any>;
declare function cookieKeep(header: string, names: string[]): string[];
export { prepareHeaders, cookieKeep };
