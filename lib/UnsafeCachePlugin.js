/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var assign = require("object-assign");

function UnsafeCachePlugin(source, filterPredicate, cache) {
	this.source = source;
	this.filterPredicate = filterPredicate;
	this.cache = cache || {};
}
module.exports = UnsafeCachePlugin;

function getCacheId(request) {
	return JSON.stringify({
		context: request.context,
		path: request.path,
		request: request.request
	});
}

UnsafeCachePlugin.prototype.apply = function(resolver) {
	var filterPredicate = this.filterPredicate;
	var cache = this.cache;
	resolver.plugin(this.source, function(request, callback) {
		if(!filterPredicate(request)) return callback();
		var cacheId = getCacheId(request);
		var cacheEntry = cache[cacheId];
		if(cacheEntry) {
			return callback(null, cacheEntry);
		}
		request.cacheIds = (request.cacheIds || []).concat(cacheId);
		return callback()
	});
};
