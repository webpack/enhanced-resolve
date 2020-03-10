export = AliasPlugin;
declare class AliasPlugin {
    /**
     * @param {string | ResolveStepHook} source source
     * @param {AliasOption | Array<AliasOption>} options options
     * @param {string | ResolveStepHook} target target
     */
    constructor(source: string | import("tapable").AsyncSeriesBailHook<[import("./Resolver").ResolveRequest, import("./Resolver").ResolveContext], import("./Resolver").ResolveRequest | null>, options: {
        alias: string | false | string[];
        name: string;
        onlyModule?: boolean | undefined;
    } | {
        alias: string | false | string[];
        name: string;
        onlyModule?: boolean | undefined;
    }[], target: string | import("tapable").AsyncSeriesBailHook<[import("./Resolver").ResolveRequest, import("./Resolver").ResolveContext], import("./Resolver").ResolveRequest | null>);
    source: string | import("tapable").AsyncSeriesBailHook<[import("./Resolver").ResolveRequest, import("./Resolver").ResolveContext], import("./Resolver").ResolveRequest | null>;
    options: {
        alias: string | false | string[];
        name: string;
        onlyModule?: boolean | undefined;
    }[];
    target: string | import("tapable").AsyncSeriesBailHook<[import("./Resolver").ResolveRequest, import("./Resolver").ResolveContext], import("./Resolver").ResolveRequest | null>;
    /**
     * @param {Resolver} resolver the resolver
     * @returns {void}
     */
    apply(resolver: import("./Resolver")): void;
}
declare namespace AliasPlugin {
    export { Resolver, ResolveStepHook, AliasOption };
}
type Resolver = import("./Resolver");
type ResolveStepHook = import("tapable").AsyncSeriesBailHook<[import("./Resolver").ResolveRequest, import("./Resolver").ResolveContext], import("./Resolver").ResolveRequest | null>;
type AliasOption = {
    alias: string | false | string[];
    name: string;
    onlyModule?: boolean | undefined;
};
