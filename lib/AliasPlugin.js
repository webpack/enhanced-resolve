/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var assign = require("object-assign");
var createInnerCallback = require("./createInnerCallback");
var getInnerRequest = require("./getInnerRequest");

function AliasPlugin(source, options, target) {
	this.source = source;
	this.name = options.name;
	this.alias = options.alias;
	this.onlyModule = options.onlyModule;
	this.target = target;
}
module.exports = AliasPlugin;

AliasPlugin.prototype.apply = function(resolver) {
	var target = this.target;
	var name = this.name;
	var alias = this.alias;
	var onlyModule = this.onlyModule;
	var nameQuery;
	var aliasQuery;

	resolver.plugin(this.source, function(request, callback) {
		var innerRequest = getInnerRequest(resolver, request);
		if(!innerRequest) return callback();
		if((!onlyModule && innerRequest.indexOf(name + "/") === 0) || innerRequest === name) {
			if(innerRequest.indexOf(alias + "/") !== 0 && innerRequest != alias) {
				nameQuery = name.indexOf("?") > -1 ? name.substr(name.indexOf("?"), name.length) : undefined;
				aliasQuery = alias.indexOf("?") > -1 ? alias.substr(alias.indexOf("?"), alias.length) : undefined;

				if(nameQuery)
					name = name.substr(0, name.indexOf("?"));
				if(aliasQuery)
					alias = alias.substr(0, alias.indexOf("?"));

				var newRequestStr = alias + innerRequest.substr(name.length);
				var obj = assign({}, request, {
					request: newRequestStr,
				});

				if(typeof nameQuery !== 'undefined' || typeof aliasQuery !== 'undefined') {
					obj.query = nameQuery || aliasQuery;
				}

				return resolver.doResolve(target, obj, "aliased with mapping '" + name + "': '" + alias + "' to '" + newRequestStr + "'", createInnerCallback(function(err, result) {
					if(arguments.length > 0) return callback(err, result);

					// don't allow other aliasing or raw request
					callback(null, null);
				}, callback));
			}
		}
		return callback();
	});
};
