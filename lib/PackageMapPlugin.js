/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { readJson } = require("./util/fs");
const {
	createError,
	findPackageIds,
	parsePackageMap,
} = require("./util/packageMap");

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveContext} ResolveContext */
/** @typedef {import("./Resolver").ResolveRequest} ResolveRequest */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */
/** @typedef {import("./util/packageMap").PackageMap} PackageMap */
/** @typedef {import("./util/packageMap").PackageMapPackages} PackageMapPackages */

/**
 * @typedef {object} PackageMapOptions
 * @property {string | null} configFile absolute path of the configuration file, read lazily when `packages` is not given
 * @property {PackageMapPackages | null} packages an already-parsed `packages` object, used instead of reading `configFile`
 */

/** @typedef {(err: Error | null, packageMap?: PackageMap) => void} PackageMapCallback */

const PACKAGE_NAME_REGEXP = /^(@[^/]+\/)?[^/]+/;

/**
 * Resolves bare specifiers through a Node.js package map instead of walking
 * `node_modules`: the importing package's `dependencies` table names the
 * package id to use, and that entry's location is handed to the regular
 * resolution pipeline to finish the job (`exports`, `main`, extensions...).
 *
 * The importing package is taken from an explicit package id when the caller
 * propagates one (`context.packageId`, or `packageId` carried over from a
 * previous result) and located by path otherwise. Two situations are hard
 * errors rather than a miss, because guessing would silently resolve to the
 * wrong package: the importer sitting outside every mapped package, and
 * several package entries sharing the importer's location. A specifier that is
 * simply absent from `dependencies` is reported as unresolved, and no
 * `node_modules` fallback is attempted.
 * @experimental Package maps are stability 1 (experimental) in Node.js and are
 * only reachable there behind `--experimental-package-map`. This plugin tracks
 * that specification and may change with it, including in a patch release.
 */
module.exports = class PackageMapPlugin {
	/**
	 * @param {string | ResolveStepHook} source source
	 * @param {PackageMapOptions} options package map options
	 * @param {string | ResolveStepHook} target target
	 */
	constructor(source, options, target) {
		this.source = source;
		this.options = options;
		this.target = target;
		/** @type {PackageMap | undefined} */
		this._packageMap = undefined;
		/** @type {PackageMapCallback[] | undefined} */
		this._pending = undefined;
	}

	/**
	 * Read and parse the configuration file once, queueing every request that
	 * arrives while the read is in flight so a cold start does not re-read the
	 * same file for each of them.
	 * @param {Resolver} resolver the resolver
	 * @param {ResolveContext} resolveContext resolve context
	 * @param {PackageMapCallback} callback callback
	 * @returns {void}
	 */
	_getPackageMap(resolver, resolveContext, callback) {
		const { configFile, packages } = this.options;

		if (configFile && resolveContext.fileDependencies) {
			resolveContext.fileDependencies.add(configFile);
		}

		if (this._packageMap !== undefined) {
			return callback(null, this._packageMap);
		}

		if (packages) {
			/** @type {PackageMap} */
			let packageMap;
			try {
				packageMap = parsePackageMap(
					{ packages },
					/** @type {string} */ (configFile),
				);
			} catch (err) {
				return callback(/** @type {Error} */ (err));
			}
			this._packageMap = packageMap;
			return callback(null, packageMap);
		}

		if (this._pending) {
			this._pending.push(callback);
			return;
		}
		this._pending = [callback];

		readJson(
			resolver.fileSystem,
			/** @type {string} */ (configFile),
			{ stripComments: false },
			(err, content) => {
				const pending = /** @type {PackageMapCallback[]} */ (this._pending);
				this._pending = undefined;

				/** @type {Error | null} */
				let error = err || null;
				/** @type {PackageMap | undefined} */
				let packageMap;

				if (!error) {
					try {
						packageMap = parsePackageMap(
							/** @type {import("./Resolver").JsonObject} */ (content),
							/** @type {string} */ (configFile),
						);
						this._packageMap = packageMap;
					} catch (parseErr) {
						error = /** @type {Error} */ (parseErr);
					}
				}

				for (const pendingCallback of pending) {
					pendingCallback(error, packageMap);
				}
			},
		);
	}

	/**
	 * @param {Resolver} resolver the resolver
	 * @returns {void}
	 */
	apply(resolver) {
		/** @type {ResolveStepHook} */
		const target = resolver.ensureHook(this.target);
		resolver
			.getHook(this.source)
			.tapAsync("PackageMapPlugin", (request, resolveContext, callback) => {
				const req = request.request;
				if (!req) return callback();
				// Builtins are not affected by package maps.
				if (req.startsWith("node:")) return callback();

				const packageMatch = PACKAGE_NAME_REGEXP.exec(req);
				if (!packageMatch) return callback();

				const [packageName] = packageMatch;
				const innerRequest = `.${req.slice(packageName.length)}`;

				this._getPackageMap(resolver, resolveContext, (err, packageMap) => {
					if (err) return callback(err);

					const { packages } = /** @type {PackageMap} */ (packageMap);
					const issuerPath = request.path;
					const explicitId =
						request.packageId ||
						(request.context &&
							/** @type {string | undefined} */ (request.context.packageId));

					/** @type {string} */
					let issuerId;

					if (explicitId) {
						if (!packages.has(explicitId)) {
							return callback(
								createError(
									`Unknown package id "${explicitId}" for request "${req}"`,
									"ERR_PACKAGE_MAP_UNKNOWN_PACKAGE",
								),
							);
						}
						issuerId = explicitId;
					} else {
						const ids =
							issuerPath === false
								? []
								: findPackageIds(
										/** @type {PackageMap} */ (packageMap),
										issuerPath,
									);

						if (ids.length === 0) {
							return callback(
								createError(
									`Cannot resolve "${req}" from "${issuerPath}": the importing file is not inside any package of the package map`,
									"ERR_PACKAGE_MAP_EXTERNAL_FILE",
								),
							);
						}
						if (ids.length > 1) {
							return callback(
								createError(
									`Cannot resolve "${req}" from "${issuerPath}": the package ids ${ids
										.map((id) => `"${id}"`)
										.join(
											", ",
										)} share this location, so the importing package is ambiguous. Propagate the package id of the previous resolution to disambiguate.`,
									"ERR_PACKAGE_MAP_AMBIGUOUS_PACKAGE",
								),
							);
						}
						[issuerId] = ids;
					}

					const issuer =
						/** @type {import("./util/packageMap").PackageMapEntry} */ (
							packages.get(issuerId)
						);
					const targetId = issuer.dependencies.get(packageName);

					if (targetId === undefined) {
						if (resolveContext.log) {
							resolveContext.log(
								`"${packageName}" is not a dependency of package "${issuerId}" in the package map`,
							);
						}
						// Bail without a result: the package map is authoritative, so
						// there is no `node_modules` fallback to try.
						return callback(null, null);
					}

					const targetEntry =
						/** @type {import("./util/packageMap").PackageMapEntry} */ (
							packages.get(targetId)
						);

					/** @type {ResolveRequest} */
					const obj = {
						...request,
						path: targetEntry.path,
						request: innerRequest,
						packageId: targetId,
						fullySpecified: request.fullySpecified && innerRequest !== ".",
					};

					resolver.doResolve(
						target,
						obj,
						`resolved "${packageName}" to package "${targetId}" by the package map`,
						resolveContext,
						(resolveErr, result) => {
							if (resolveErr) return callback(resolveErr);
							if (result) return callback(null, result);
							// Skip alternatives
							return callback(null, null);
						},
					);
				});
			});
	}
};
