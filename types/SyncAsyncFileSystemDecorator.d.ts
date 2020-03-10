export = SyncAsyncFileSystemDecorator;
/**
 * @param {Object} fs file system implementation
 * @constructor
 */
declare function SyncAsyncFileSystemDecorator(fs: any): void;
declare class SyncAsyncFileSystemDecorator {
    /**
     * @param {Object} fs file system implementation
     * @constructor
     */
    constructor(fs: any);
    /**
     * @type {Object}
     */
    fs: Object;
    stat: (arg: any, callback: any) => any;
    statSync: (arg: any) => any;
    readdir: (arg: any, callback: any) => any;
    readdirSync: (arg: any) => any;
    readFile: (arg: any, callback: any) => any;
    readFileSync: (arg: any) => any;
    readlink: (arg: any, callback: any) => any;
    readlinkSync: (arg: any) => any;
    readJson: (arg: any, callback: any) => any;
    readJsonSync: (arg: any) => any;
}
