/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ResolverFactory = require("./ResolverFactory");
var assign = require("object-assign");

var NodeJsInputFileSystem = require("./NodeJsInputFileSystem");
var SyncNodeJsInputFileSystem = require("./SyncNodeJsInputFileSystem");
var CachedInputFileSystem = require("./CachedInputFileSystem");

var asyncFileSystem = new CachedInputFileSystem(new NodeJsInputFileSystem(), 4000);
var syncFileSystem = new CachedInputFileSystem(new SyncNodeJsInputFileSystem(), 4000);

var asyncResolver = ResolverFactory.createResolver({
	extensions: [".js", ".json", ".node"],
	fileSystem: asyncFileSystem
});
module.exports = function resolve(context, request, callback) {
	asyncResolver.resolve({}, context, request, callback);
};

var syncResolver = ResolverFactory.createResolver({
	extensions: [".js", ".json", ".node"],
	fileSystem: syncFileSystem
});
module.exports.sync = function resolveSync(context, request) {
	return syncResolver.resolveSync({}, context, request);
};

var asyncContextResolver = ResolverFactory.createResolver({
	extensions: [".js", ".json", ".node"],
	resolveToContext: true,
	fileSystem: asyncFileSystem
});
module.exports.context = function resolveContext(context, request, callback) {
	asyncContextResolver.resolve({}, context, request, callback);
};

var syncContextResolver = ResolverFactory.createResolver({
	extensions: [".js", ".json", ".node"],
	resolveToContext: true,
	fileSystem: syncFileSystem
});
module.exports.context.sync = function resolveContextSync(context, request) {
	return syncContextResolver.resolveSync({}, context, request);
};

var asyncLoaderResolver = ResolverFactory.createResolver({
	extensions: [".js", ".json", ".node"],
	moduleExtensions: ["-loader"],
	mainFields: ["loader", "main"],
	fileSystem: asyncFileSystem
});
module.exports.loader = function resolveLoader(context, request, callback) {
	asyncLoaderResolver.resolve({}, context, request, callback);
};

var syncLoaderResolver = ResolverFactory.createResolver({
	extensions: [".js", ".json", ".node"],
	moduleExtensions: ["-loader"],
	mainFields: ["loader", "main"],
	fileSystem: syncFileSystem
});
module.exports.loader.sync = function resolveLoaderSync(context, request) {
	return syncLoaderResolver.resolveSync({}, context, request);
};

module.exports.create = function create(options) {
	options = assign({
		fileSystem: asyncFileSystem
	}, options);
	var resolver = ResolverFactory.createResolver(options);
	return function(context, request, callback) {
		resolver.resolve({}, context, request, callback);
	};
};

module.exports.create.sync = function createSync(options) {
	options = assign({
		fileSystem: syncFileSystem
	}, options);
	var resolver = ResolverFactory.createResolver(options);
	return function(context, request) {
		return resolver.resolveSync({}, context, request);
	};
};

// Export Resolver, FileSystems and Plugins
module.exports.ResolverFactory = ResolverFactory;

module.exports.NodeJsInputFileSystem = NodeJsInputFileSystem;
module.exports.SyncNodeJsInputFileSystem = SyncNodeJsInputFileSystem;
module.exports.CachedInputFileSystem = CachedInputFileSystem;
