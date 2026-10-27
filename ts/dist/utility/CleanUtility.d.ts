import { Context } from '../types';
type CleanConfig = {
    active: boolean;
    keys: string[];
    values: string[];
    mask: string;
    hint: number;
    min: number;
};
declare function splitvalues(values: any): string[];
declare function makeCleanConfig(cleanopts: any): CleanConfig;
declare function cleanAdd(ctx: Context, value: any): void;
declare function clean(ctx: Context, val: any): any;
declare function setMessage(err: any, text: string): void;
declare function cleanKey(ctx: Context, key: any): boolean;
declare function cleanAddSensitive(ctx: Context, val: any, under?: boolean, depth?: number, seen?: any[], parent?: string): void;
export { clean, cleanAdd, cleanAddSensitive, cleanKey, makeCleanConfig, setMessage, splitvalues, };
