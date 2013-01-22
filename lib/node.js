/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Resolver = require("./Resolver");
var NodeJsInputFileSystem = require("./NodeJsInputFileSystem");
var SyncNodeJsInputFileSystem = require("./SyncNodeJsInputFileSystem");
var CachedInputFileSystem = require("./CachedInputFileSystem");
var ModulesInDirectoriesPlugin = require("./ModulesInDirectoriesPlugin");
var ModuleAsDirectoryPlugin = require("./ModuleAsDirectoryPlugin");
var ModuleDefaultFilePlugin = require("./ModuleDefaultFilePlugin");
var ModuleDescriptionFilePlugin = require("./ModuleDescriptionFilePlugin");
var FileAppendPlugin = require("./FileAppendPlugin");
var DirectoryResultPlugin = require("./DirectoryResultPlugin");

var commonPlugins = [
	new ModulesInDirectoriesPlugin("node", ["node_modules"]),
	new ModuleAsDirectoryPlugin("node"),
	new ModuleDescriptionFilePlugin("package.json", ["main"]),
	new ModuleDefaultFilePlugin(["index"]),
	new FileAppendPlugin([".js", ".node", ""])
];

var commonContextPlugins = [
	new ModulesInDirectoriesPlugin("node", ["node_modules"]),
	new ModuleAsDirectoryPlugin("node"),
	new DirectoryResultPlugin()
];

var commonLoaderPlugins = [
	new ModulesInDirectoriesPlugin("node", ["node_modules", "node_loaders"]),
	new ModuleAsDirectoryPlugin("node", ["*-loader", "*"]),
	new ModuleDescriptionFilePlugin("package.json", ["loader", "main"]),
	new ModuleDefaultFilePlugin(["index"]),
	new FileAppendPlugin([".loader.js", ".js", ""])
];

var asyncFileSystem = new CachedInputFileSystem(new NodeJsInputFileSystem(), 4000);
var syncFileSystem = new CachedInputFileSystem(new SyncNodeJsInputFileSystem(), 4000);


var asyncResolver = new Resolver(asyncFileSystem);
asyncResolver.apply.apply(asyncResolver, commonPlugins);
module.exports = function resolve(context, request, callback) {
	asyncResolver.resolve(context, request, callback);
};

var syncResolver = new Resolver(syncFileSystem);
syncResolver.apply.apply(syncResolver, commonPlugins);
module.exports.sync = function resolveSync(context, request) {
	return syncResolver.resolveSync(context, request);
};


var asyncContextResolver = new Resolver(asyncFileSystem);
asyncContextResolver.apply.apply(asyncContextResolver, commonContextPlugins);
module.exports.context = function resolveContext(context, request, callback) {
	asyncContextResolver.resolve(context, request, callback);
};

var syncContextResolver = new Resolver(syncFileSystem);
syncContextResolver.apply.apply(syncContextResolver, commonContextPlugins);
module.exports.context.sync = function resolveSync(context, request) {
	return syncContextResolver.resolveSync(context, request);
};


var asyncLoaderResolver = new Resolver(asyncFileSystem);
asyncLoaderResolver.apply.apply(asyncLoaderResolver, commonContextPlugins);
module.exports.loader = function resolveContext(context, request, callback) {
	asyncLoaderResolver.resolve(context, request, callback);
};

var syncLoaderResolver = new Resolver(syncFileSystem);
syncLoaderResolver.apply.apply(syncLoaderResolver, commonContextPlugins);
module.exports.loader.sync = function resolveSync(context, request) {
	return syncLoaderResolver.resolveSync(context, request);
};

// Export Resolver, FileSystems and Plugins
module.exports.Resolver = Resolver;
module.exports.NodeJsInputFileSystem = NodeJsInputFileSystem;
module.exports.SyncNodeJsInputFileSystem = SyncNodeJsInputFileSystem;
module.exports.CachedInputFileSystem = CachedInputFileSystem;
module.exports.ModulesInDirectoriesPlugin = ModulesInDirectoriesPlugin;
module.exports.ModuleAsDirectoryPlugin = ModuleAsDirectoryPlugin;
module.exports.ModuleDefaultFilePlugin = ModuleDefaultFilePlugin;
module.exports.ModuleDescriptionFilePlugin = ModuleDescriptionFilePlugin;
module.exports.FileAppendPlugin = FileAppendPlugin;
module.exports.DirectoryResultPlugin = DirectoryResultPlugin;
