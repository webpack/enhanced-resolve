export = SyncAsyncFileSystemDecorator;
/** @typedef {import("./Resolver").FileSystem} FileSystem */
/** @typedef {import("./Resolver").StringCallback} StringCallback */
/** @typedef {import("./Resolver").SyncFileSystem} SyncFileSystem */
/** @typedef {Function} SyncOrAsyncFunction */
/** @typedef {any} ResultOfSyncOrAsyncFunction */
/**
 * @param {SyncFileSystem} fs file system implementation
 * @constructor
 */
declare function SyncAsyncFileSystemDecorator(fs: SyncFileSystem): void;
declare class SyncAsyncFileSystemDecorator {
    /** @typedef {import("./Resolver").FileSystem} FileSystem */
    /** @typedef {import("./Resolver").StringCallback} StringCallback */
    /** @typedef {import("./Resolver").SyncFileSystem} SyncFileSystem */
    /** @typedef {Function} SyncOrAsyncFunction */
    /** @typedef {any} ResultOfSyncOrAsyncFunction */
    /**
     * @param {SyncFileSystem} fs file system implementation
     * @constructor
     */
    constructor(fs: SyncFileSystem);
    fs: import("./Resolver").SyncFileSystem;
    lstat: import("./Resolver").LStat | undefined;
    lstatSync: import("./Resolver").LStatSync | undefined;
    stat: import("./Resolver").Stat;
    statSync: import("./Resolver").StatSync;
    readdir: import("./Resolver").Readdir;
    readdirSync: import("./Resolver").ReaddirSync;
    readFile: import("./Resolver").ReadFile;
    readFileSync: import("./Resolver").ReadFileSync;
    readlink: import("./Resolver").Readlink;
    readlinkSync: import("./Resolver").ReadlinkSync;
    readJson: import("./Resolver").ReadJson | undefined;
    readJsonSync: import("./Resolver").ReadJsonSync | undefined;
    realpath: import("./Resolver").RealPath | undefined;
    realpathSync: import("./Resolver").RealPathSync | undefined;
}
declare namespace SyncAsyncFileSystemDecorator {
    export { FileSystem, StringCallback, SyncFileSystem, SyncOrAsyncFunction, ResultOfSyncOrAsyncFunction };
}
type FileSystem = import("./Resolver").FileSystem;
type StringCallback = import("./Resolver").StringCallback;
type SyncFileSystem = import("./Resolver").SyncFileSystem;
type SyncOrAsyncFunction = Function;
type ResultOfSyncOrAsyncFunction = any;
