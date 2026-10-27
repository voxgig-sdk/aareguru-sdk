declare class Control {
    throw?: boolean;
    err?: any;
    explain?: any;
    signal?: AbortSignal;
    constructor(ctrlmap: Record<string, any>);
}
export { Control, };
