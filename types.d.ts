/*
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

import { AsyncSeriesBailHook, AsyncSeriesHook, SyncHook } from "tapable";

declare class CachedInputFileSystem {
	constructor(fileSystem?: any, duration?: any);
	fileSystem: any;
	stat(path?: any, callback?: any): void;
	statSync(path?: any): any;
	readdir(path?: any, callback?: any): void;
	readdirSync(path?: any): any;
	readFile(path?: any, callback?: any): void;
	readFileSync(path?: any): any;
	readJson(path?: any, callback?: any): void;
	readJsonSync(path?: any): any;
	readlink(path?: any, callback?: any): void;
	readlinkSync(path?: any): any;
	purge(what?: any): void;
}
declare class CloneBasenamePlugin {
	constructor(source?: any, target?: any);
	source: any;
	target: any;
	apply(resolver: Resolver): void;
}
declare interface FileSystem {
	readFile: (
		arg0: string,
		arg1: (
			arg0: undefined | null | (PossibleFileSystemError & Error),
			arg1: undefined | string | Buffer
		) => void
	) => void;
	readJson?:
		| undefined
		| ((
				arg0: string,
				arg1: (
					arg0: undefined | null | (PossibleFileSystemError & Error),
					arg1?: any
				) => void
		  ) => void);
	readlink: (
		arg0: string,
		arg1: (
			arg0: undefined | null | (PossibleFileSystemError & Error),
			arg1: undefined | string | Buffer
		) => void
	) => void;
	stat: (
		arg0: string,
		arg1: (
			arg0: undefined | null | (PossibleFileSystemError & Error),
			arg1: undefined | FileSystemStats
		) => void
	) => void;
}
declare interface FileSystemStats {
	isDirectory: () => boolean;
	isFile: () => boolean;
}
declare class LogInfoPlugin {
	constructor(source?: any);
	source: any;
	apply(resolver: Resolver): void;
}
declare interface ParsedIdentifier {
	request: string;
	query: string;
	fragment: string;
	directory: boolean;
	module: boolean;
	file: boolean;
}
declare interface PnpApiImpl {
	resolveToUnqualified: (arg0: string, arg1: string, arg2?: any) => string;
}
declare interface PossibleFileSystemError {
	code?: undefined | string;
	errno?: undefined | number;
	path?: undefined | string;
	syscall?: undefined | string;
}

/**
 * Resolve context
 */
declare interface ResolveContext {
	contextDependencies?: undefined | { add: (T?: any) => void };

	/**
	 * files that was found on file system
	 */
	fileDependencies?: undefined | { add: (T?: any) => void };

	/**
	 * dependencies that was not found on file system
	 */
	missingDependencies?: undefined | { add: (T?: any) => void };

	/**
	 * set of hooks' calls. For instance, `resolve → parsedResolve → describedResolve`,
	 */
	stack?: undefined | Set<string>;

	/**
	 * log function
	 */
	log?: undefined | ((arg0: string) => void);
}
declare interface ResolveOptions {
	alias: ({
		alias: string | false | (string)[];
		name: string;
		onlyModule?: undefined | boolean;
	})[];
	aliasFields: Set<string | (string)[]>;
	cachePredicate: (arg0: ResolveRequest) => boolean;
	cacheWithContext: boolean;

	/**
	 * A list of exports field condition names.
	 */
	conditionNames: Set<string>;
	descriptionFiles: (string)[];
	enforceExtension: boolean;
	exportsFields: Set<string | (string)[]>;
	extensions: Set<string>;
	fileSystem: FileSystem;
	unsafeCache: any;
	symlinks: boolean;
	resolver?: undefined | Resolver;
	modules: (string | (string)[])[];
	mainFields: ({ name: (string)[]; forceRelative: boolean })[];
	mainFiles: Set<string>;
	plugins: (
		| { apply: (arg0: Resolver) => void }
		| ((this: Resolver, arg1: Resolver) => void))[];
	pnpApi: null | PnpApiImpl;
	roots: Set<string>;
	resolveToContext: boolean;
	restrictions: Set<string | RegExp>;
}
declare interface ResolveRequest {
	path: string | false;
	request?: undefined | string;
	query?: undefined | string;
	fragment?: undefined | string;
	directory?: undefined | boolean;
	module?: undefined | boolean;
	descriptionFilePath?: undefined | string;
	descriptionFileRoot?: undefined | string;
	descriptionFileData?: any;
	relativePath?: undefined | string;
	ignoreSymlinks?: undefined | boolean;
}
declare abstract class Resolver {
	fileSystem: FileSystem;
	options: ResolveOptions;
	hooks: {
		resolveStep: SyncHook<
			[
				AsyncSeriesBailHook<
					[ResolveRequest, ResolveContext],
					null | ResolveRequest
				>,
				ResolveRequest
			],
			void
		>;
		noResolve: SyncHook<[ResolveRequest, Error], void>;
		resolve: AsyncSeriesBailHook<
			[ResolveRequest, ResolveContext],
			null | ResolveRequest
		>;
		result: AsyncSeriesHook<[ResolveRequest, ResolveContext]>;
	};
	ensureHook(
		name:
			| string
			| AsyncSeriesBailHook<
					[ResolveRequest, ResolveContext],
					null | ResolveRequest
			  >
	): AsyncSeriesBailHook<
		[ResolveRequest, ResolveContext],
		null | ResolveRequest
	>;
	getHook(
		name:
			| string
			| AsyncSeriesBailHook<
					[ResolveRequest, ResolveContext],
					null | ResolveRequest
			  >
	): AsyncSeriesBailHook<
		[ResolveRequest, ResolveContext],
		null | ResolveRequest
	>;
	resolveSync(context: any, path: string, request: string): string | false;
	resolve(
		context: any,
		path: string,
		request: string,
		resolveContext: ResolveContext,
		callback: (
			arg0: null | Error,
			arg1: undefined | string | false,
			arg2: undefined | ResolveRequest
		) => void
	): void;
	doResolve(
		hook?: any,
		request?: any,
		message?: any,
		resolveContext?: any,
		callback?: any
	): any;
	parse(identifier: string): ParsedIdentifier;
	isModule(path?: any): boolean;
	isDirectory(path: string): boolean;
	join(path?: any, request?: any): string;
	normalize(path?: any): string;
}
declare interface UserResolveOptions {
	/**
	 * A list of module alias configurations or an object which maps key to value
	 */
	alias?:
		| undefined
		| { [index: string]: string | false | (string)[] }
		| ({
				alias: string | false | (string)[];
				name: string;
				onlyModule?: undefined | boolean;
		  })[];

	/**
	 * A list of alias fields in description files
	 */
	aliasFields?: undefined | (string | (string)[])[];

	/**
	 * A function which decides whether a request should be cached or not. An object is passed with at least `path` and `request` properties.
	 */
	cachePredicate?: undefined | ((arg0: ResolveRequest) => boolean);

	/**
	 * Whether or not the unsafeCache should include request context as part of the cache key.
	 */
	cacheWithContext?: undefined | boolean;

	/**
	 * A list of description files to read from
	 */
	descriptionFiles?: undefined | (string)[];

	/**
	 * A list of exports field condition names.
	 */
	conditionNames?: undefined | (string)[];

	/**
	 * Enforce that a extension from extensions must be used
	 */
	enforceExtension?: undefined | boolean;

	/**
	 * A list of exports fields in description files
	 */
	exportsFields?: undefined | (string | (string)[])[];

	/**
	 * A list of extensions which should be tried for files
	 */
	extensions?: undefined | (string)[];

	/**
	 * The file system which should be used
	 */
	fileSystem: FileSystem;

	/**
	 * Use this cache object to unsafely cache the successful requests
	 */
	unsafeCache?: any;

	/**
	 * Resolve symlinks to their symlinked location
	 */
	symlinks?: undefined | boolean;

	/**
	 * A prepared Resolver to which the plugins are attached
	 */
	resolver?: undefined | Resolver;

	/**
	 * A list of directories to resolve modules from, can be absolute path or folder name
	 */
	modules?: undefined | string | (string)[];

	/**
	 * A list of main fields in description files
	 */
	mainFields?:
		| undefined
		| (
				| string
				| (string)[]
				| { name: string | (string)[]; forceRelative: boolean })[];

	/**
	 * A list of main files in directories
	 */
	mainFiles?: undefined | (string)[];

	/**
	 * A list of additional resolve plugins which should be applied
	 */
	plugins?:
		| undefined
		| (
				| { apply: (arg0: Resolver) => void }
				| ((this: Resolver, arg1: Resolver) => void))[];

	/**
	 * A PnP API that should be used - null is "never", undefined is "auto"
	 */
	pnpApi?: undefined | null | PnpApiImpl;

	/**
	 * A list of root paths
	 */
	roots?: undefined | (string)[];

	/**
	 * Resolve to a context instead of a file
	 */
	resolveToContext?: undefined | boolean;

	/**
	 * A list of resolve restrictions
	 */
	restrictions?: undefined | (string | RegExp)[];

	/**
	 * Use only the sync constiants of the file system calls
	 */
	useSyncFileSystemCalls?: undefined | boolean;
}
declare function exports(
	context?: any,
	path?: any,
	request?: any,
	resolveContext?: any,
	callback?: any
): void;
declare namespace exports {
	export const sync: (
		context?: any,
		path?: any,
		request?: any
	) => string | false;
	export function create(
		options?: any
	): (
		context?: any,
		path?: any,
		request?: any,
		resolveContext?: any,
		callback?: any
	) => void;
	export namespace create {
		export const sync: (
			options?: any
		) => (context?: any, path?: any, request?: any) => string | false;
	}
	export namespace ResolverFactory {
		export let createResolver: (options: UserResolveOptions) => Resolver;
	}
	export const forEachBail: (
		array?: any,
		iterator?: any,
		callback?: any
	) => any;
	export type Plugin =
		| { apply: (arg0: Resolver) => void }
		| ((this: Resolver, arg1: Resolver) => void);
	export {
		CachedInputFileSystem,
		CloneBasenamePlugin,
		LogInfoPlugin,
		PnpApiImpl as PnpApi,
		Resolver,
		FileSystem,
		ResolveContext,
		ResolveRequest,
		UserResolveOptions as ResolveOptions
	};
}

export = exports;
