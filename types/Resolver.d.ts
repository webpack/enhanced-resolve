export = Resolver;
declare class Resolver {
    /**
     * @param {FileSystem} fileSystem a filesystem
     * @param {ResolveOptions} options options
     */
    constructor(fileSystem: FileSystem, options: import("./ResolverFactory").ResolveOptions);
    fileSystem: FileSystem;
    options: import("./ResolverFactory").ResolveOptions;
    hooks: {
        /** @type {SyncHook<[ResolveStepHook, ResolveRequest], void>} */
        resolveStep: import("tapable").SyncHook<[import("tapable").AsyncSeriesBailHook<[ResolveRequest, ResolveContext], ResolveRequest | null>, ResolveRequest], void>;
        /** @type {SyncHook<[ResolveRequest, Error]>} */
        noResolve: import("tapable").SyncHook<[ResolveRequest, Error], void>;
        /** @type {ResolveStepHook} */
        resolve: import("tapable").AsyncSeriesBailHook<[ResolveRequest, ResolveContext], ResolveRequest | null>;
        /** @type {AsyncSeriesHook<[ResolveRequest, ResolveContext], void>} */
        result: import("tapable").AsyncSeriesHook<[ResolveRequest, ResolveContext]>;
    };
    /**
     * @param {string | ResolveStepHook} name hook name or hook itself
     * @returns {ResolveStepHook} the hook
     */
    ensureHook(name: string | import("tapable").AsyncSeriesBailHook<[ResolveRequest, ResolveContext], ResolveRequest | null>): import("tapable").AsyncSeriesBailHook<[ResolveRequest, ResolveContext], ResolveRequest | null>;
    /**
     * @param {string | ResolveStepHook} name hook name or hook itself
     * @returns {ResolveStepHook} the hook
     */
    getHook(name: string | import("tapable").AsyncSeriesBailHook<[ResolveRequest, ResolveContext], ResolveRequest | null>): import("tapable").AsyncSeriesBailHook<[ResolveRequest, ResolveContext], ResolveRequest | null>;
    /**
     * @param {object} context context information object
     * @param {string} path context path
     * @param {string} request request string
     * @returns {string | false} result
     */
    resolveSync(context: any, path: string, request: string): string | false;
    /**
     * @param {object} context context information object
     * @param {string} path context path
     * @param {string} request request string
     * @param {ResolveContext} resolveContext resolve context
     * @param {function(Error | null, string=, ResolveRequest=): void} callback callback function
     * @returns {void}
     */
    resolve(context: any, path: string, request: string, resolveContext: ResolveContext, callback: (arg0: Error | null, arg1?: string | undefined, arg2?: ResolveRequest | undefined) => void): void;
    doResolve(hook: any, request: any, message: any, resolveContext: any, callback: any): any;
    parse(identifier: any): {
        request: string;
        query: string;
        module: boolean;
        directory: boolean;
        file: boolean;
    };
    isModule(path: any): boolean;
    /**
     * @param {string} path a path
     * @returns {boolean} true, if the path is a directory path
     */
    isDirectory(path: string): boolean;
    join(path: any, request: any): string;
    normalize(path: any): string;
}
declare namespace Resolver {
    export { createStackEntry, ResolveOptions, FileSystemStats, FileSystem, ResolveRequest, StackEntry, WriteOnlySet, ResolveContext, ResolveStepHook };
}
type FileSystem = {
    readFile: (arg0: string, arg1: (arg0: Error | null | undefined, arg1?: string | Buffer | undefined) => void) => void;
    readlink: (arg0: string, arg1: (arg0: Error | null | undefined, arg1?: string | Buffer | undefined) => void) => void;
    stat: (arg0: string, arg1: (arg0: Error | null | undefined, arg1?: FileSystemStats | undefined) => void) => void;
};
type ResolveRequest = {
    path: string | false;
    request?: string | undefined;
    query?: string | undefined;
    directory?: boolean | undefined;
    module?: boolean | undefined;
    descriptionFilePath?: string | undefined;
    descriptionFileRoot?: string | undefined;
    descriptionFileData?: any;
    relativePath?: string | undefined;
    ignoreSymlinks?: boolean | undefined;
};
/**
 * Resolve context
 */
type ResolveContext = {
    contextDependencies?: {
        add: (T: any) => void;
    } | undefined;
    /**
     * files that was found on file system
     */
    fileDependencies?: {
        add: (T: any) => void;
    } | undefined;
    /**
     * dependencies that was not found on file system
     */
    missingDependencies?: {
        add: (T: any) => void;
    } | undefined;
    /**
     * set of hooks' calls. For instance, `resolve → parsedResolve → describedResolve`,
     */
    stack?: Set<string> | undefined;
    /**
     * log function
     */
    log?: ((arg0: string) => void) | undefined;
};
/**
 * @param {ResolveStepHook} hook hook
 * @param {ResolveRequest} request request
 * @returns {StackEntry} stack entry
 */
declare function createStackEntry(hook: import("tapable").AsyncSeriesBailHook<[ResolveRequest, ResolveContext], ResolveRequest | null>, request: ResolveRequest): string;
type ResolveOptions = {
    alias: {
        alias: string | false | string[];
        name: string;
        onlyModule?: boolean | undefined;
    }[];
    aliasFields: string[][];
    cachePredicate: (arg0: ResolveRequest) => boolean;
    cacheWithContext: boolean;
    descriptionFiles: string[];
    enforceExtension: boolean;
    extensions: string[];
    fileSystem: FileSystem;
    unsafeCache: any;
    symlinks: boolean;
    resolver?: Resolver | undefined;
    modules: (string | string[])[];
    mainFields: {
        name: string[];
        forceRelative: boolean;
    }[];
    mainFiles: string[];
    plugins: ({
        apply: (arg0: Resolver) => void;
    } | ((arg0: Resolver) => void))[];
    pnpApi: import("./PnpPlugin").PnpApiImpl | null;
    resolveToContext: boolean;
};
type FileSystemStats = {
    isDirectory: () => boolean;
    isFile: () => boolean;
};
/**
 * String with special formatting
 */
type StackEntry = string;
/**
 * <T>
 */
type WriteOnlySet<T> = {
    add: (T: any) => void;
};
type ResolveStepHook = import("tapable").AsyncSeriesBailHook<[ResolveRequest, ResolveContext], ResolveRequest | null>;
