export = AliasFieldPlugin;
declare class AliasFieldPlugin {
    /**
     * @param {string | ResolveStepHook} source source
     * @param {string | Array<string>} field field
     * @param {string | ResolveStepHook} target target
     */
    constructor(source: string | import("tapable").AsyncSeriesBailHook<[import("./Resolver").ResolveRequest, import("./Resolver").ResolveContext], import("./Resolver").ResolveRequest | null>, field: string | string[], target: string | import("tapable").AsyncSeriesBailHook<[import("./Resolver").ResolveRequest, import("./Resolver").ResolveContext], import("./Resolver").ResolveRequest | null>);
    source: string | import("tapable").AsyncSeriesBailHook<[import("./Resolver").ResolveRequest, import("./Resolver").ResolveContext], import("./Resolver").ResolveRequest | null>;
    field: string | string[];
    target: string | import("tapable").AsyncSeriesBailHook<[import("./Resolver").ResolveRequest, import("./Resolver").ResolveContext], import("./Resolver").ResolveRequest | null>;
    /**
     * @param {Resolver} resolver the resolver
     * @returns {void}
     */
    apply(resolver: import("./Resolver")): void;
}
declare namespace AliasFieldPlugin {
    export { Resolver, ResolveRequest, ResolveStepHook };
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
