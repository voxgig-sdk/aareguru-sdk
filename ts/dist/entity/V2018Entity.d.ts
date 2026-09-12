import { AareguruEntityBase } from '../AareguruEntityBase';
import type { AareguruSDK } from '../AareguruSDK';
import type { Control } from '../types';
import type { V2018, V2018LoadMatch } from '../AareguruTypes';
declare class V2018Entity extends AareguruEntityBase<V2018> {
    constructor(client: AareguruSDK, entopts: any);
    make(this: V2018Entity): V2018Entity;
    load(this: any, reqmatch?: V2018LoadMatch, ctrl?: Control): Promise<V2018Entity>;
}
export { V2018Entity };
