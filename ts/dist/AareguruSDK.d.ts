import { LegacyEntity } from './entity/LegacyEntity';
import { StuffEntity } from './entity/StuffEntity';
import { V2018Entity } from './entity/V2018Entity';
export type * from './AareguruTypes';
import { inspect } from 'node:util';
import type { Context, Feature } from './types';
import { config } from './Config';
import { AareguruEntityBase } from './AareguruEntityBase';
import { Utility } from './utility/Utility';
import { BaseFeature } from './feature/base/BaseFeature';
declare const stdutil: Utility;
declare class AareguruSDK {
    _mode: string;
    _options: any;
    _utility: Utility;
    _features: Feature[];
    _rootctx: Context;
    constructor(options?: any);
    options(): any;
    utility(): any;
    prepare(fetchargs?: any): Promise<any>;
    direct(fetchargs?: any): Promise<Error | {
        ok: boolean;
        status: number;
        headers: any;
        data: any;
        err?: undefined;
    } | {
        ok: boolean;
        err: any;
        status?: undefined;
        headers?: undefined;
        data?: undefined;
    }>;
    _rawRequest(fetchargs?: any): Promise<Error | {
        ok: boolean;
        status: number;
        headers: any;
        data: any;
        err?: undefined;
    } | {
        ok: boolean;
        err: any;
        status?: undefined;
        headers?: undefined;
        data?: undefined;
    }>;
    graphql(query: string, variables?: any, ctrl?: any): Promise<any>;
    Legacy(entopts?: Record<string, any>): LegacyEntity;
    Stuff(entopts?: Record<string, any>): StuffEntity;
    V2018(entopts?: Record<string, any>): V2018Entity;
    static test(testoptsarg?: any, sdkoptsarg?: any): AareguruSDK;
    tester(testopts?: any, sdkopts?: any): AareguruSDK;
    toJSON(): {
        name: string;
    };
    toString(): string;
    [inspect.custom](): string;
}
declare const SDK: typeof AareguruSDK;
export { stdutil, config, BaseFeature, AareguruEntityBase, AareguruSDK, SDK, };
