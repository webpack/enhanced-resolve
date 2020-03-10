export = UseFilePlugin;
declare class UseFilePlugin {
    /**
     * @param {string | ResolveStepHook} source source
     * @param {string} filename filename
     * @param {string | ResolveStepHook} target target
     */
    constructor(source: string | import("tapable").AsyncSeriesBailHook<[import("./Resolver").ResolveRequest, import("./Resolver").ResolveContext], import("./Resolver").ResolveRequest | null>, filename: string, target: string | import("tapable").AsyncSeriesBailHook<[import("./Resolver").ResolveRequest, import("./Resolver").ResolveContext], import("./Resolver").ResolveRequest | null>);
    source: string | import("tapable").AsyncSeriesBailHook<[import("./Resolver").ResolveRequest, import("./Resolver").ResolveContext], import("./Resolver").ResolveRequest | null>;
    filename: string;
    target: string | import("tapable").AsyncSeriesBailHook<[import("./Resolver").ResolveRequest, import("./Resolver").ResolveContext], import("./Resolver").ResolveRequest | null>;
    /**
     * @param {Resolver} resolver the resolver
     * @returns {void}
     */
    apply(resolver: import("./Resolver")): void;
}
declare namespace UseFilePlugin {
    export { Resolver, ResolveStepHook };
}
type Resolver = import("./Resolver");
type ResolveStepHook = import("tapable").AsyncSeriesBailHook<[import("./Resolver").ResolveRequest, import("./Resolver").ResolveContext], import("./Resolver").ResolveRequest | null>;
