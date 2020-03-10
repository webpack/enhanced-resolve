export = UnsafeCachePlugin;
declare class UnsafeCachePlugin {
    /**
     * @param {string | ResolveStepHook} source source
     * @param {function(ResolveRequest): boolean} filterPredicate filterPredicate
     * @param {Cache} cache cache
     * @param {boolean} withContext withContext
     * @param {string | ResolveStepHook} target target
     */
    constructor(source: string | import("tapable").AsyncSeriesBailHook<[import("./Resolver").ResolveRequest, import("./Resolver").ResolveContext], import("./Resolver").ResolveRequest | null>, filterPredicate: (arg0: import("./Resolver").ResolveRequest) => boolean, cache: {
        [k: string]: any;
    }, withContext: boolean, target: string | import("tapable").AsyncSeriesBailHook<[import("./Resolver").ResolveRequest, import("./Resolver").ResolveContext], import("./Resolver").ResolveRequest | null>);
    source: string | import("tapable").AsyncSeriesBailHook<[import("./Resolver").ResolveRequest, import("./Resolver").ResolveContext], import("./Resolver").ResolveRequest | null>;
    filterPredicate: (arg0: import("./Resolver").ResolveRequest) => boolean;
    withContext: boolean;
    cache: {
        [k: string]: any;
    };
    target: string | import("tapable").AsyncSeriesBailHook<[import("./Resolver").ResolveRequest, import("./Resolver").ResolveContext], import("./Resolver").ResolveRequest | null>;
    /**
     * @param {Resolver} resolver the resolver
     * @returns {void}
     */
    apply(resolver: import("./Resolver")): void;
}
declare namespace UnsafeCachePlugin {
    export { Resolver, ResolveRequest, ResolveStepHook, Cache };
}
type Resolver = import("./Resolver");
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
type ResolveStepHook = import("tapable").AsyncSeriesBailHook<[import("./Resolver").ResolveRequest, import("./Resolver").ResolveContext], import("./Resolver").ResolveRequest | null>;
type Cache = {
    [k: string]: any;
};
