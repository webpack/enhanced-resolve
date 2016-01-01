/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var assign = require("object-assign");

function SaveToCachePlugin(source, cache) {
	this.source = source;
	this.cache = cache;
}
module.exports = SaveToCachePlugin;

SaveToCachePlugin.prototype.apply = function(resolver) {
	var cache = this.cache;
	resolver.plugin(this.source, function(request, callback) {
		if(request.cacheIds) {
			var obj = assign({}, request);
			delete obj.cacheIds;
			delete obj.descriptionFileData;
			request.cacheIds.forEach(function(cacheId) {
				cache[cacheId] = obj;
			});
		}
		callback();
	});
};
