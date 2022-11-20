const { ResolverFactory, CachedInputFileSystem } = require("../lib");
const fs = require("fs");
const path = require("path");

const myResolver = ResolverFactory.createResolver({
	fileSystem: new CachedInputFileSystem(fs, 4000),
	extensions: [".json", ".js", ".ts"]
});

const context = {};
const resolveContext = {};
const lookupStartPath = path.resolve(__dirname);
const request = "./a";
myResolver.resolve(
	context,
	lookupStartPath,
	request,
	resolveContext,
	(err, path, result) => {
		if (err) {
			console.log("createResolve err: ", err);
		} else {
			console.log("createResolve path: ", path);
		}
	}
);
