"use strict";
/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
const createInnerCallback = require("./createInnerCallback");

class UnsafeCachePlugin {
	constructor(source, filterPredicate, cache, target) {
		this.source = source;
		this.filterPredicate = filterPredicate;
		this.cache = cache || {};
		this.target = target;
	}

	apply(resolver) {
		const filterPredicate = this.filterPredicate;
		const cache = this.cache;
		const target = this.target;
		resolver.plugin(this.source, (request, callback) => {
			if(!filterPredicate(request)) return callback();
			const cacheId = getCacheId(request);
			const cacheEntry = cache[cacheId];
			if(cacheEntry) return callback(null, cacheEntry);
			resolver.doResolve(target, request, null, createInnerCallback((err, result) => {
				if(err) return callback(err);
				if(result) return callback(null, cache[cacheId] = result);
				callback();
			}, callback));
		});
	}
}

module.exports = UnsafeCachePlugin;

const getCacheId = request => JSON.stringify({
	context: request.context,
	path: request.path,
	query: request.query,
	request: request.request
});
