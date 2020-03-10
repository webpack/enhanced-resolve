declare function _exports(context: any, path: any, request: any, resolveContext: any, callback: any): void;
export = _exports;
export function sync(context: any, path: any, request: any): string | false;
export function create(options: any): (context: any, path: any, request: any, resolveContext: any, callback: any) => void;
export namespace create {
    export function sync(options: any): (context: any, path: any, request: any) => string | false;
}
export var ResolverFactory: typeof import("./ResolverFactory");
export var CachedInputFileSystem: {
    new (fileSystem: any, duration: any): import("./CachedInputFileSystem");
};
