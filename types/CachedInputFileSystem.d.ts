export = CachedInputFileSystem;
declare class CachedInputFileSystem {
    constructor(fileSystem: any, duration: any);
    fileSystem: any;
    _statStorage: Storage;
    _readdirStorage: Storage;
    _readFileStorage: Storage;
    _readJsonStorage: Storage;
    _readlinkStorage: Storage;
    _stat: any;
    stat(path: any, callback: any): void;
    _statSync: any;
    statSync(path: any): any;
    _readdir: any;
    readdir(path: any, callback: any): void;
    _readdirSync: any;
    readdirSync(path: any): any;
    _readFile: any;
    readFile(path: any, callback: any): void;
    _readFileSync: any;
    readFileSync(path: any): any;
    _readJson: any;
    readJson(path: any, callback: any): void;
    _readJsonSync: any;
    readJsonSync(path: any): any;
    _readlink: any;
    readlink(path: any, callback: any): void;
    _readlinkSync: any;
    readlinkSync(path: any): any;
    purge(what: any): void;
}
declare class Storage {
    constructor(duration: any);
    duration: any;
    running: Map<any, any>;
    data: Map<any, any>;
    levels: any[];
    count: number;
    /** @type {NodeJS.Timeout | null} */
    interval: NodeJS.Timeout | null;
    needTickCheck: boolean;
    nextTick: number | null;
    passive: boolean;
    tick(): true | undefined;
    ensureTick(): void;
    finished(name: any, err: any, result: any): void;
    finishedSync(name: any, err: any, result: any): void;
    provide(name: any, provider: any, callback: any): void;
    provideSync(name: any, provider: any): any;
    checkTicks(): void;
    purge(what: any): void;
    purgeParent(what: any): void;
}
