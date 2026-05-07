/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const { aliasResolveHandler, compileAliasOptions } = require("./AliasUtils");
const { modulesResolveHandler } = require("./ModulesUtils");
const { readJson } = require("./util/fs");
const { PathType: _PathType, isSubPath, normalize } = require("./util/path");

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */
/** @typedef {import("./AliasUtils").AliasOption} AliasOption */
/** @typedef {import("./Resolver").ResolveRequest} ResolveRequest */
/** @typedef {import("./Resolver").ResolveContext} ResolveContext */
/** @typedef {import("./Resolver").FileSystem} FileSystem */
/** @typedef {import("./Resolver").TsconfigPathsData} TsconfigPathsData */
/** @typedef {import("./Resolver").TsconfigPathsMap} TsconfigPathsMap */
/** @typedef {import("./ResolverFactory").TsconfigOptions} TsconfigOptions */

/**
 * @typedef {object} TsconfigCompilerOptions
 * @property {string=} baseUrl Base URL for resolving paths
 * @property {{ [key: string]: string[] }=} paths TypeScript paths mapping
 */

/**
 * @typedef {object} TsconfigReference
 * @property {string} path Path to the referenced project
 */

/**
 * @typedef {object} Tsconfig
 * @property {TsconfigCompilerOptions=} compilerOptions Compiler options
 * @property {string | string[]=} extends Extended configuration paths
 * @property {TsconfigReference[]=} references Project references
 */

const DEFAULT_CONFIG_FILE = "tsconfig.json";

/**
 * @param {string} pattern Path pattern
 * @returns {number} Length of the prefix
 */
function getPrefixLength(pattern) {
	const prefixLength = pattern.indexOf("*");
	if (prefixLength === -1) {
		return pattern.length;
	}
	return prefixLength;
}

/**
 * Sort path patterns.
 * If a module name can be matched with multiple patterns then pattern with the longest prefix will be picked.
 * @param {string[]} arr Array of path patterns
 * @returns {string[]} Array of path patterns sorted by longest prefix
 */
function sortByLongestPrefix(arr) {
	return [...arr].sort((a, b) => getPrefixLength(b) - getPrefixLength(a));
}

/**
 * Merge two tsconfig objects
 * @param {Tsconfig | null} base base config
 * @param {Tsconfig | null} config config to merge
 * @returns {Tsconfig} merged config
 */
function mergeTsconfigs(base, config) {
	base = base || {};
	config = config || {};

	return {
		...base,
		...config,
		compilerOptions: {
			.../** @type {TsconfigCompilerOptions} */ (base.compilerOptions),
			.../** @type {TsconfigCompilerOptions} */ (config.compilerOptions),
		},
	};
}

/**
 * Substitute ${configDir} template variable in path
 * @param {string} pathValue the path value
 * @param {string} configDir the config directory
 * @returns {string} the path with substituted template
 */
function substituteConfigDir(pathValue, configDir) {
	return pathValue.replace(/\$\{configDir\}/g, configDir);
}

/**
 * Convert tsconfig paths to resolver options
 * @param {string} configDir Config file directory
 * @param {{ [key: string]: string[] }} paths TypeScript paths mapping
 * @param {Resolver} resolver resolver instance
 * @param {string=} baseUrl Base URL for resolving paths (relative to configDir)
 * @returns {TsconfigPathsData} the resolver options
 */
function tsconfigPathsToResolveOptions(configDir, paths, resolver, baseUrl) {
	// Calculate absolute base URL
	const absoluteBaseUrl = !baseUrl
		? configDir
		: resolver.join(configDir, baseUrl);

	/** @type {string[]} */
	const sortedKeys = sortByLongestPrefix(Object.keys(paths));
	/** @type {AliasOption[]} */
	const alias = [];
	/** @type {string[]} */
	const modules = [];

	for (const pattern of sortedKeys) {
		const mappings = paths[pattern];
		// Substitute ${configDir} in path mappings
		const absolutePaths = mappings.map((mapping) => {
			const substituted = substituteConfigDir(mapping, configDir);
			return resolver.join(absoluteBaseUrl, substituted);
		});

		if (absolutePaths.length > 0) {
			if (pattern === "*") {
				modules.push(
					...absolutePaths
						.map((dir) => {
							if (/[/\\]\*$/.test(dir)) {
								return dir.replace(/[/\\]\*$/, "");
							}
							return "";
						})
						.filter(Boolean),
				);
			} else {
				alias.push({ name: pattern, alias: absolutePaths });
			}
		}
	}

	if (absoluteBaseUrl && !modules.includes(absoluteBaseUrl)) {
		modules.push(absoluteBaseUrl);
	}

	return {
		alias: compileAliasOptions(resolver, alias),
		modules,
	};
}

/**
 * Get the base context for the current project
 * @param {string} context the context
 * @param {Resolver} resolver resolver instance
 * @param {string=} baseUrl base URL for resolving paths
 * @returns {string} the base context
 */
function getAbsoluteBaseUrl(context, resolver, baseUrl) {
	return !baseUrl ? context : resolver.join(context, baseUrl);
}

module.exports = class TsconfigPathsPlugin {
	/**
	 * @param {true | string | TsconfigOptions} configFileOrOptions tsconfig file path or options object
	 */
	constructor(configFileOrOptions) {
		if (
			typeof configFileOrOptions === "object" &&
			configFileOrOptions !== null
		) {
			// Options object format
			const { configFile } = configFileOrOptions;
			/** @type {boolean} */
			this.isAutoConfigFile = typeof configFile !== "string";
			/** @type {string} */
			this.configFile = this.isAutoConfigFile
				? DEFAULT_CONFIG_FILE
				: /** @type {string} */ (configFile);
			/** @type {string[] | "auto"} */
			if (Array.isArray(configFileOrOptions.references)) {
				/** @type {TsconfigReference[] | "auto"} */
				this.references = configFileOrOptions.references.map((ref) => ({
					path: ref,
				}));
			} else if (configFileOrOptions.references === "auto") {
				this.references = "auto";
			} else {
				this.references = [];
			}
			/** @type {string | undefined} */
			this.baseUrl = configFileOrOptions.baseUrl;
		} else {
			/** @type {boolean} */
			this.isAutoConfigFile = configFileOrOptions === true;
			/** @type {string} */
			this.configFile = this.isAutoConfigFile
				? DEFAULT_CONFIG_FILE
				: /** @type {string} */ (configFileOrOptions);
			/** @type {TsconfigReference[] | "auto"} */
			this.references = [];
			/** @type {string | undefined} */
			this.baseUrl = undefined;
		}
	}

	/**
	 * @param {Resolver} resolver the resolver
	 * @returns {void}
	 */
	apply(resolver) {
		const aliasTarget = resolver.ensureHook("internal-resolve");
		const moduleTarget = resolver.ensureHook("module");

		/**
		 * @template T
		 * @param {string} hookName hook name
		 * @param {ResolveStepHook} target target hook
		 * @param {(data: TsconfigPathsData) => T} pickField pick alias/modules field
		 * @param {(resolver: Resolver, value: T, target: ResolveStepHook, request: ResolveRequest, resolveContext: ResolveContext, callback: (err?: null | Error, result?: null | ResolveRequest) => void) => void} handler handler
		 * @returns {void}
		 */
		const tap = (hookName, target, pickField, handler) => {
			resolver
				.getHook(hookName)
				.tapAsync(
					"TsconfigPathsPlugin",
					(request, resolveContext, callback) => {
						this._getTsconfigPathsMap(
							resolver,
							request,
							resolveContext,
							(err, tsconfigPathsMap) => {
								if (err) return callback(err);
								if (!tsconfigPathsMap) return callback();

								const selectedData = this._selectPathsDataForContext(
									request.path,
									tsconfigPathsMap,
								);

								if (!selectedData) return callback();

								handler(
									resolver,
									pickField(selectedData),
									target,
									request,
									resolveContext,
									callback,
								);
							},
						);
					},
				);
		};

		tap("raw-resolve", aliasTarget, (data) => data.alias, aliasResolveHandler);
		tap(
			"raw-module",
			moduleTarget,
			(data) => data.modules,
			modulesResolveHandler,
		);
	}

	/**
	 * @param {TsconfigPathsMap} tsconfigPathsMap the tsconfig paths map
	 * @param {ResolveContext} resolveContext the resolve context
	 * @returns {void}
	 */
	_addFileDependencies(tsconfigPathsMap, resolveContext) {
		if (!resolveContext.fileDependencies) return;
		for (const fileDependency of tsconfigPathsMap.fileDependencies) {
			resolveContext.fileDependencies.add(fileDependency);
		}
	}

	/**
	 * Get TsconfigPathsMap for the request (with caching)
	 * @param {Resolver} resolver the resolver
	 * @param {ResolveRequest} request the request
	 * @param {ResolveContext} resolveContext the resolve context
	 * @param {(err: Error | null, result?: TsconfigPathsMap | null) => void} callback the callback
	 * @returns {void}
	 */
	_getTsconfigPathsMap(resolver, request, resolveContext, callback) {
		if (typeof request.tsconfigPathsMap !== "undefined") {
			if (!request.tsconfigPathsMap) return callback(null, null);
			this._addFileDependencies(request.tsconfigPathsMap, resolveContext);
			return callback(null, request.tsconfigPathsMap);
		}

		const absTsconfigPath = resolver.join(
			request.path || process.cwd(),
			this.configFile,
		);
		this._loadTsconfigPathsMap(resolver, absTsconfigPath, (err, result) => {
			if (err) {
				request.tsconfigPathsMap = null;
				if (
					this.isAutoConfigFile &&
					/** @type {NodeJS.ErrnoException} */ (err).code === "ENOENT"
				) {
					return callback(null, null);
				}
				return callback(err);
			}

			request.tsconfigPathsMap = /** @type {TsconfigPathsMap} */ (result);
			this._addFileDependencies(request.tsconfigPathsMap, resolveContext);
			callback(null, request.tsconfigPathsMap);
		});
	}

	/**
	 * Load tsconfig.json and build complete TsconfigPathsMap
	 * Includes main project paths and all referenced projects
	 * @param {Resolver} resolver the resolver
	 * @param {string} absTsconfigPath absolute path to tsconfig.json
	 * @param {(err: Error | null, result?: TsconfigPathsMap) => void} callback the callback
	 * @returns {void}
	 */
	_loadTsconfigPathsMap(resolver, absTsconfigPath, callback) {
		/** @type {Set<string>} */
		const fileDependencies = new Set();

		this._loadTsconfig(
			resolver,
			absTsconfigPath,
			fileDependencies,
			undefined,
			(err, config) => {
				if (err) return callback(err);

				const cfg = /** @type {Tsconfig} */ (config);
				const compilerOptions = cfg.compilerOptions || {};
				const mainContext = resolver.dirname(absTsconfigPath);

				const baseUrl =
					this.baseUrl !== undefined ? this.baseUrl : compilerOptions.baseUrl;

				const main = tsconfigPathsToResolveOptions(
					mainContext,
					compilerOptions.paths || {},
					resolver,
					baseUrl,
				);
				/** @type {{ [baseUrl: string]: TsconfigPathsData }} */
				const refs = {};

				let referencesToUse = null;
				if (this.references === "auto") {
					referencesToUse = cfg.references;
				} else if (Array.isArray(this.references)) {
					referencesToUse = this.references;
				}

				const finish = () => {
					const allContexts =
						/** @type {{ [context: string]: TsconfigPathsData }} */ ({
							[mainContext]: main,
							...refs,
						});
					// Precompute the key list once per tsconfig load. `_selectPathsDataForContext`
					// runs per resolve and otherwise would call `Object.entries(allContexts)`
					// each time, allocating a fresh [key, value][] array.
					const contextList = Object.keys(allContexts);
					callback(null, {
						main,
						mainContext,
						refs,
						allContexts,
						contextList,
						fileDependencies,
					});
				};

				if (Array.isArray(referencesToUse)) {
					this._loadTsconfigReferences(
						resolver,
						mainContext,
						referencesToUse,
						fileDependencies,
						refs,
						(refErr) => {
							if (refErr) return callback(refErr);
							finish();
						},
					);
				} else {
					finish();
				}
			},
		);
	}

	/**
	 * Select the correct TsconfigPathsData based on request.path (context-aware)
	 * Matches the behavior of tsconfig-paths-webpack-plugin
	 * @param {string | false} requestPath the request path
	 * @param {TsconfigPathsMap} tsconfigPathsMap the tsconfig paths map
	 * @returns {TsconfigPathsData | null} the selected paths data
	 */
	_selectPathsDataForContext(requestPath, tsconfigPathsMap) {
		const { main, allContexts, contextList } = tsconfigPathsMap;
		if (!requestPath) {
			return main;
		}
		let longestMatch = null;
		let longestMatchLength = 0;
		// Iterate over the pre-computed key list + indexed access into
		// `allContexts` — the previous `Object.entries(allContexts)` form
		// allocated a fresh `[key, value][]` array on every resolve.
		for (let i = 0; i < contextList.length; i++) {
			const context = contextList[i];
			const data = allContexts[context];
			if (context === requestPath) {
				return data;
			}
			if (
				isSubPath(context, requestPath) &&
				context.length > longestMatchLength
			) {
				longestMatch = data;
				longestMatchLength = context.length;
			}
		}
		if (longestMatch) {
			return longestMatch;
		}
		return null;
	}

	/**
	 * Load tsconfig from extends path
	 * @param {Resolver} resolver the resolver
	 * @param {string} configFilePath current config file path
	 * @param {string} extendedConfigValue extends value
	 * @param {Set<string>} fileDependencies the file dependencies
	 * @param {Set<string>} visitedConfigPaths config paths being loaded (for circular extends detection)
	 * @param {(err: Error | null, result?: Tsconfig) => void} callback callback
	 * @returns {void}
	 */
	_loadTsconfigFromExtends(
		resolver,
		configFilePath,
		extendedConfigValue,
		fileDependencies,
		visitedConfigPaths,
		callback,
	) {
		const { fileSystem } = resolver;
		const currentDir = resolver.dirname(configFilePath);

		// Substitute ${configDir} in extends path
		extendedConfigValue = substituteConfigDir(extendedConfigValue, currentDir);

		// Remember the original value before potentially appending .json
		const originalExtendedConfigValue = extendedConfigValue;

		if (
			typeof extendedConfigValue === "string" &&
			!extendedConfigValue.includes(".json")
		) {
			extendedConfigValue += ".json";
		}

		const initialExtendedConfigPath = resolver.join(
			currentDir,
			extendedConfigValue,
		);

		fileSystem.readFile(initialExtendedConfigPath, (existsErr) => {
			let extendedConfigPath = initialExtendedConfigPath;
			if (existsErr) {
				// Handle scoped package extends like "@scope/name" (no sub-path):
				// "@scope/name" should resolve to node_modules/@scope/name/tsconfig.json,
				// not node_modules/@scope/name.json
				// See: test/fixtures/tsconfig-paths/extends-pkg-entry/
				if (
					typeof originalExtendedConfigValue === "string" &&
					originalExtendedConfigValue.startsWith("@") &&
					originalExtendedConfigValue.split("/").length === 2
				) {
					extendedConfigPath = resolver.join(
						currentDir,
						normalize(
							`node_modules/${originalExtendedConfigValue}/${DEFAULT_CONFIG_FILE}`,
						),
					);
				} else if (extendedConfigValue.includes("/")) {
					// Handle package sub-path extends like "react/tsconfig":
					// "react/tsconfig" resolves to node_modules/react/tsconfig.json
					// See: test/fixtures/tsconfig-paths/extends-npm/
					extendedConfigPath = resolver.join(
						currentDir,
						normalize(`node_modules/${extendedConfigValue}`),
					);
				}
			}

			this._loadTsconfig(
				resolver,
				extendedConfigPath,
				fileDependencies,
				visitedConfigPaths,
				(err, config) => {
					if (err) return callback(err);

					const cfg = /** @type {Tsconfig} */ (config);
					const compilerOptions = cfg.compilerOptions || {
						baseUrl: undefined,
					};

					if (compilerOptions.baseUrl) {
						const extendedConfigDir = resolver.dirname(extendedConfigPath);
						compilerOptions.baseUrl = getAbsoluteBaseUrl(
							extendedConfigDir,
							resolver,
							compilerOptions.baseUrl,
						);
					}

					delete cfg.references;

					callback(null, cfg);
				},
			);
		});
	}

	/**
	 * Load referenced tsconfig projects and store in referenceMatchMap
	 * Simple implementation matching tsconfig-paths-webpack-plugin:
	 * Just load each reference and store independently
	 * @param {Resolver} resolver the resolver
	 * @param {string} context the context
	 * @param {TsconfigReference[]} references array of references
	 * @param {Set<string>} fileDependencies the file dependencies
	 * @param {{ [baseUrl: string]: TsconfigPathsData }} referenceMatchMap the map to populate
	 * @param {(err: Error | null) => void} callback callback
	 * @returns {void}
	 */
	_loadTsconfigReferences(
		resolver,
		context,
		references,
		fileDependencies,
		referenceMatchMap,
		callback,
	) {
		if (references.length === 0) return callback(null);

		let pending = references.length;
		const finishOne = () => {
			if (--pending === 0) callback(null);
		};

		for (const ref of references) {
			const refPath = substituteConfigDir(ref.path, context);
			const refConfigPath = resolver.join(
				resolver.join(context, refPath),
				DEFAULT_CONFIG_FILE,
			);

			this._loadTsconfig(
				resolver,
				refConfigPath,
				fileDependencies,
				undefined,
				(err, refConfig) => {
					// Failures are swallowed to match tsconfig-paths-webpack-plugin:
					// a broken reference must not abort the main project's resolution.
					if (err) return finishOne();

					const cfg = /** @type {Tsconfig} */ (refConfig);
					if (cfg.compilerOptions && cfg.compilerOptions.paths) {
						const refContext = resolver.dirname(refConfigPath);

						referenceMatchMap[refContext] = tsconfigPathsToResolveOptions(
							refContext,
							cfg.compilerOptions.paths || {},
							resolver,
							cfg.compilerOptions.baseUrl,
						);
					}

					if (this.references === "auto" && Array.isArray(cfg.references)) {
						this._loadTsconfigReferences(
							resolver,
							resolver.dirname(refConfigPath),
							cfg.references,
							fileDependencies,
							referenceMatchMap,
							finishOne,
						);
					} else {
						finishOne();
					}
				},
			);
		}
	}

	/**
	 * Load tsconfig.json with extends support
	 * @param {Resolver} resolver the resolver
	 * @param {string} configFilePath absolute path to tsconfig.json
	 * @param {Set<string>} fileDependencies the file dependencies
	 * @param {Set<string> | undefined} visitedConfigPaths config paths being loaded (for circular extends detection)
	 * @param {(err: Error | null, result?: Tsconfig) => void} callback callback
	 * @returns {void}
	 */
	_loadTsconfig(
		resolver,
		configFilePath,
		fileDependencies,
		visitedConfigPaths,
		callback,
	) {
		const visited = visitedConfigPaths || new Set();

		if (visited.has(configFilePath)) {
			return callback(null, /** @type {Tsconfig} */ ({}));
		}
		visited.add(configFilePath);

		readJson(
			resolver.fileSystem,
			configFilePath,
			{ stripComments: true },
			(err, parsed) => {
				if (err) return callback(/** @type {Error} */ (err));

				const config = /** @type {Tsconfig} */ (parsed);
				fileDependencies.add(configFilePath);

				const extendedConfig = config.extends;
				if (!extendedConfig) return callback(null, config);

				const extendsList = Array.isArray(extendedConfig)
					? extendedConfig
					: [extendedConfig];
				/** @type {Tsconfig} */
				let base = {};
				let i = 0;
				const next = () => {
					if (i >= extendsList.length) {
						return callback(null, mergeTsconfigs(base, config));
					}
					this._loadTsconfigFromExtends(
						resolver,
						configFilePath,
						extendsList[i++],
						fileDependencies,
						visited,
						(extErr, extendedTsconfig) => {
							if (extErr) return callback(extErr);
							base = mergeTsconfigs(
								base,
								/** @type {Tsconfig} */ (extendedTsconfig),
							);
							next();
						},
					);
				};
				next();
			},
		);
	}
};
