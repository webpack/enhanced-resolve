export = PnpPlugin;
declare class PnpPlugin {
    /**
     * @param {string | ResolveStepHook} source source
     * @param {PnpApiImpl} pnpApi pnpApi
     * @param {string | ResolveStepHook} target target
     */
    constructor(source: string | import("tapable").AsyncSeriesBailHook<[import("./Resolver").ResolveRequest, import("./Resolver").ResolveContext], import("./Resolver").ResolveRequest | null>, pnpApi: PnpApiImpl, target: string | import("tapable").AsyncSeriesBailHook<[import("./Resolver").ResolveRequest, import("./Resolver").ResolveContext], import("./Resolver").ResolveRequest | null>);
    source: string | import("tapable").AsyncSeriesBailHook<[import("./Resolver").ResolveRequest, import("./Resolver").ResolveContext], import("./Resolver").ResolveRequest | null>;
    pnpApi: PnpApiImpl;
    target: string | import("tapable").AsyncSeriesBailHook<[import("./Resolver").ResolveRequest, import("./Resolver").ResolveContext], import("./Resolver").ResolveRequest | null>;
    /**
     * @param {Resolver} resolver the resolver
     * @returns {void}
     */
    apply(resolver: import("./Resolver")): void;
}
declare namespace PnpPlugin {
    export { Resolver, ResolveStepHook, PnpApiImpl };
}
type PnpApiImpl = {
    resolveToUnqualified: (arg0: string, arg1: string, arg2: any) => string;
};
type Resolver = import("./Resolver");
type ResolveStepHook = import("tapable").AsyncSeriesBailHook<[import("./Resolver").ResolveRequest, import("./Resolver").ResolveContext], import("./Resolver").ResolveRequest | null>;
