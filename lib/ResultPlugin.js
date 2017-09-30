/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function ResultPlugin(source) {
	this.source = source;
}
module.exports = ResultPlugin;

ResultPlugin.prototype.apply = function(resolver) {
	this.source.tapAsync("ResultPlugin", (request, resolverContext, callback) => {
		var obj = Object.assign({}, request);
		if(resolverContext.log) resolverContext.log("reporting result " + obj.path);
		resolver.hooks.result.callAsync(obj, resolverContext, err => {
			if(err) return callback(err);
			callback(null, obj);
		});
	});
};
