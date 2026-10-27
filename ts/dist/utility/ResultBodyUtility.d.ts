import { Context } from '../types';
type Unreadable = {
    status: number;
    headers: any;
    text?: any;
    sent?: any;
    failed?: any;
};
declare function resultBody(ctx: Context): Promise<import("../Result").Result | undefined>;
declare function unreadableBody(ctx: Context, res: Unreadable): any;
export { resultBody, unreadableBody, };
