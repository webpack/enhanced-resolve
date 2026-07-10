/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Aman Thakur @jhonsnow456
*/

"use strict";

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveRequest} ResolveRequest */

/**
 * @typedef {object} TraceRequest
 * @property {string} path resolving directory
 * @property {string} request request string
 * @property {string} query query string
 * @property {string} fragment fragment string
 * @property {boolean} module is a module request
 * @property {boolean} directory is a directory request
 * @property {string=} descriptionFilePath path to description file if found
 * @property {string=} relativePath relative path from description file
 */

/**
 * @typedef {object} TraceEntry
 * @property {string} hook which pipeline hook fired
 * @property {TraceRequest} request snapshot of the request at this step
 * @property {string | false | null} result what this step produced (null = skipped)
 * @property {number} timestamp Date.now() when the step ran
 */

/**
 * A collector that stores structured trace entries during resolution.
 */
class TraceCollector {
	constructor() {
		/** @type {TraceEntry[]} */
		this._entries = [];
	}

	/**
	 * @param {string} hook hook name
	 * @param {ResolveRequest} request the request object
	 * @param {string | false | null} result result from this step
	 * @returns {void}
	 */
	_addEntry(hook, request, result) {
		/** @type {TraceRequest} */
		const requestSnapshot = {
			path: request.path || "",
			request: request.request || "",
			query: request.query || "",
			fragment: request.fragment || "",
			module: Boolean(request.module),
			directory: Boolean(request.directory),
		};
		if (request.descriptionFilePath) {
			requestSnapshot.descriptionFilePath = request.descriptionFilePath;
		}
		if (request.relativePath) {
			requestSnapshot.relativePath = request.relativePath;
		}

		this._entries.push({
			hook,
			request: requestSnapshot,
			result: result === undefined ? null : result,
			timestamp: Date.now(),
		});
	}

	/**
	 * Returns all collected trace entries.
	 * @returns {TraceEntry[]} entries
	 */
	getEntries() {
		return this._entries;
	}

	/**
	 * Clears all collected entries.
	 * @returns {void}
	 */
	clear() {
		this._entries.length = 0;
	}
}

/**
 * A plugin that records structured trace entries for every resolution step.
 * Tap into `resolveStep` and `result` hooks to build a machine-readable
 * trace of the resolution pipeline.
 * @example
 * const trace = TracePlugin.createCollector();
 * const resolver = ResolverFactory.createResolver({
 *   fileSystem: cachedFs,
 *   plugins: [new TracePlugin(trace)],
 * });
 * resolver.resolve({}, __dirname, "lodash/merge", {}, (err, result) => {
 *   console.log(trace.getEntries());
 * });
 */
class TracePlugin {
	/**
	 * @param {TraceCollector} collector collector to write entries into
	 */
	constructor(collector) {
		this.collector = collector;
	}

	/**
	 * Creates a new TraceCollector instance.
	 * @returns {TraceCollector} collector
	 */
	static createCollector() {
		return new TraceCollector();
	}

	/**
	 * @param {Resolver} resolver the resolver
	 * @returns {void}
	 */
	apply(resolver) {
		const { collector } = this;

		resolver.hooks.resolveStep.tap("TracePlugin", (hook, request) => {
			collector._addEntry(/** @type {string} */ (hook.name), request, null);
		});

		resolver.hooks.result.tap("TracePlugin", (request) => {
			collector._addEntry("result", request, request.path);
		});
	}
}

module.exports = TracePlugin;
