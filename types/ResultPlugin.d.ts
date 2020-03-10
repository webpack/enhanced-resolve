export = ResultPlugin;
declare class ResultPlugin {
    /**
     * @param {AsyncHook} source source
     */
    constructor(source: import("tapable").AsyncHook<any, any>);
    source: import("tapable").AsyncHook<any, any>;
    /**
     * @param {Resolver} resolver the resolver
     * @returns {void}
     */
    apply(resolver: import("./Resolver")): void;
}
declare namespace ResultPlugin {
    export { AsyncHook, Resolver };
}
type AsyncHook = import("tapable").AsyncHook<any, any>;
type Resolver = import("./Resolver");
