/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var createInnerCallback = require("./createInnerCallback");
var assign = require("object-assign");

function ModulesInRootPlugin(moduleType, path) {
	this.moduleType = moduleType;
	this.path = path;
}
module.exports = ModulesInRootPlugin;

ModulesInRootPlugin.prototype.apply = function(resolver) {
	var moduleType = this.moduleType;
	var path = this.path;
	resolver.plugin("module", function(request, callback) {
		var obj = assign({}, request, {
			path: path
		});
		this.applyPluginsParallelBailResult(
			"module-" + moduleType,
			obj,
			createInnerCallback(function innerCallback(err, result) {
				if(err) return callback(err);
				if(!result) return callback();
				return callback(null, result);
			}, callback, "looking for modules in " + path)
		);
	});
};
