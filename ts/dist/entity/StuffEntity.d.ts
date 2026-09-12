import { AareguruEntityBase } from '../AareguruEntityBase';
import type { AareguruSDK } from '../AareguruSDK';
import type { Control } from '../types';
import type { Stuff, StuffLoadMatch } from '../AareguruTypes';
declare class StuffEntity extends AareguruEntityBase<Stuff> {
    constructor(client: AareguruSDK, entopts: any);
    make(this: StuffEntity): StuffEntity;
    load(this: any, reqmatch?: StuffLoadMatch, ctrl?: Control): Promise<StuffEntity>;
}
export { StuffEntity };
