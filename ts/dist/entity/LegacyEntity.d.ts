import { AareguruEntityBase } from '../AareguruEntityBase';
import type { AareguruSDK } from '../AareguruSDK';
import type { Control } from '../types';
import type { Legacy, LegacyLoadMatch } from '../AareguruTypes';
declare class LegacyEntity extends AareguruEntityBase<Legacy> {
    constructor(client: AareguruSDK, entopts: any);
    make(this: LegacyEntity): LegacyEntity;
    load(this: any, reqmatch?: LegacyLoadMatch, ctrl?: Control): Promise<LegacyEntity>;
}
export { LegacyEntity };
