import { Context } from './Context';
declare class AareguruError extends Error {
    isAareguruError: boolean;
    sdk: string;
    code: string;
    ctx: Context;
    status: number;
    get notFound(): boolean;
    constructor(code: string, msg: string, ctx: Context);
}
export { AareguruError };
