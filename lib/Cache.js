/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {{ [k: string]: undefined | import("./Resolver").ResolveRequest | import("./Resolver").ResolveRequest[] }} CacheData */

/**
 * @typedef {object} CacheOptions
 * @property {number=} maxSize Maximum number of entries in path caches (join/dirname) before clearing (0 = unlimited)
 * @property {Record<string, unknown>=} owner An object whose lifetime controls the cache. When the owner is garbage collected, the cache is also released.
 */

/** @type {WeakMap<Record<string, unknown>, Cache>} */
const cacheByOwner = new WeakMap();

class Cache {
	/**
	 * @param {CacheOptions} options cache options
	 */
	constructor({ maxSize = 0 } = {}) {
		/** @type {number} */
		this.maxSize = maxSize;
		/** @type {CacheData} */
		this.data = /** @type {CacheData} */ (Object.create(null));
	}
}

/**
 * @param {CacheOptions=} options cache options
 * @returns {Cache} cache instance
 */
function createCache(options = {}) {
	const { owner } = options;
	if (owner) {
		let cache = cacheByOwner.get(owner);
		if (cache) return cache;
		cache = new Cache(options);
		cacheByOwner.set(owner, cache);
		return cache;
	}
	return new Cache(options);
}

module.exports = Cache;

module.exports.createCache = createCache;
