export function createResolver(options: UserResolveOptions): import("./Resolver");
export type PnpApi = {
    resolveToUnqualified: (arg0: string, arg1: string, arg2: any) => string;
};
export type FileSystem = {
    readFile: (arg0: string, arg1: (arg0: Error | null | undefined, arg1?: string | Buffer | undefined) => void) => void;
    readlink: (arg0: string, arg1: (arg0: Error | null | undefined, arg1?: string | Buffer | undefined) => void) => void;
    stat: (arg0: string, arg1: (arg0: Error | null | undefined, arg1?: import("./Resolver").FileSystemStats | undefined) => void) => void;
};
export type ResolveRequest = {
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
export type AliasOptionNewRequest = string | false | string[];
export type AliasOptionEntry = {
    alias: string | false | string[];
    name: string;
    onlyModule?: boolean | undefined;
};
export type AliasOptions = {
    [k: string]: string | false | string[];
};
export type Plugin = {
    apply: (arg0: import("./Resolver")) => void;
} | ((arg0: import("./Resolver")) => void);
export type UserResolveOptions = {
    /**
     * A list of module alias configurations or an object which maps key to value
     */
    alias?: {
        [k: string]: string | false | string[];
    } | {
        alias: string | false | string[];
        name: string;
        onlyModule?: boolean | undefined;
    }[] | undefined;
    /**
     * A list of alias fields in description files
     */
    aliasFields?: (string | string[])[] | undefined;
    /**
     * A function which decides whether a request should be cached or not. An object is passed with at least `path` and `request` properties.
     */
    cachePredicate?: ((arg0: import("./Resolver").ResolveRequest) => boolean) | undefined;
    /**
     * Whether or not the unsafeCache should include request context as part of the cache key.
     */
    cacheWithContext?: boolean | undefined;
    /**
     * A list of description files to read from
     */
    descriptionFiles?: string[] | undefined;
    /**
     * Enforce that a extension from extensions must be used
     */
    enforceExtension?: boolean | undefined;
    /**
     * A list of extensions which should be tried for files
     */
    extensions?: string[] | undefined;
    /**
     * The file system which should be used
     */
    fileSystem: import("./Resolver").FileSystem;
    /**
     * Use this cache object to unsafely cache the successful requests
     */
    unsafeCache?: any;
    /**
     * Resolve symlinks to their symlinked location
     */
    symlinks?: boolean | undefined;
    /**
     * A prepared Resolver to which the plugins are attached
     */
    resolver?: import("./Resolver") | undefined;
    /**
     * A list of directories to resolve modules from, can be absolute path or folder name
     */
    modules?: string | string[] | undefined;
    /**
     * A list of main fields in description files
     */
    mainFields?: (string | string[] | {
        name: string | string[];
        forceRelative: boolean;
    })[] | undefined;
    /**
     * A list of main files in directories
     */
    mainFiles?: string[] | undefined;
    /**
     * A list of additional resolve plugins which should be applied
     */
    plugins?: ({
        apply: (arg0: import("./Resolver")) => void;
    } | ((arg0: import("./Resolver")) => void))[] | undefined;
    /**
     * A PnP API that should be used - null is "never", undefined is "auto"
     */
    pnpApi?: import("./PnpPlugin").PnpApiImpl | null | undefined;
    /**
     * Resolve to a context instead of a file
     */
    resolveToContext?: boolean | undefined;
    /**
     * Use only the sync constiants of the file system calls
     */
    useSyncFileSystemCalls?: boolean | undefined;
};
export type ResolveOptions = {
    alias: {
        alias: string | false | string[];
        name: string;
        onlyModule?: boolean | undefined;
    }[];
    aliasFields: string[][];
    cachePredicate: (arg0: import("./Resolver").ResolveRequest) => boolean;
    cacheWithContext: boolean;
    descriptionFiles: string[];
    enforceExtension: boolean;
    extensions: string[];
    fileSystem: import("./Resolver").FileSystem;
    unsafeCache: any;
    symlinks: boolean;
    resolver?: import("./Resolver") | undefined;
    modules: (string | string[])[];
    mainFields: {
        name: string[];
        forceRelative: boolean;
    }[];
    mainFiles: string[];
    plugins: ({
        apply: (arg0: import("./Resolver")) => void;
    } | ((arg0: import("./Resolver")) => void))[];
    pnpApi: import("./PnpPlugin").PnpApiImpl | null;
    resolveToContext: boolean;
};
