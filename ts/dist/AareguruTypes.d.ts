export interface Legacy {
}
export interface LegacyLoadMatch {
    app?: string;
    version?: string;
}
export interface Stuff {
}
export interface StuffLoadMatch {
    app?: string;
    line?: number;
    service: string;
    version?: string;
}
export interface V2018 {
}
export interface V2018LoadMatch {
    app?: string;
    city: string;
    end: string;
    start: string;
    value?: string;
    version?: string;
    $action?: string;
    [action: string]: any;
}
