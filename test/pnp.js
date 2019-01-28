var path = require("path");
require("should");
var ResolverFactory = require("../lib/ResolverFactory");
var NodeJsInputFileSystem = require("../lib/NodeJsInputFileSystem");
var CachedInputFileSystem = require("../lib/CachedInputFileSystem");

var pnpApi = {
	mocks: new Map(),
	resolveToUnqualified(request, issuer) {
		if (pnpApi.mocks.has(request)) {
			return pnpApi.mocks.get(request);
		} else {
			throw new Error(`No way`);
		}
	}
};

var nodeFileSystem = new CachedInputFileSystem(
	new NodeJsInputFileSystem(),
	4000
);

var resolver = ResolverFactory.createResolver({
	extensions: [".ts", ".js"],
	fileSystem: nodeFileSystem,
	pnpApi
});

var fixture = path.resolve(__dirname, "fixtures", "pnp");

describe("extensions", function() {
	it("should resolve by going through the pnp api", function(done) {
		pnpApi.mocks.set(
			"pkg/dir/index.js",
			path.resolve(fixture, "pkg/dir/index.js")
		);
		resolver.resolve({}, fixture, "pkg/dir/index.js", {}, function(
			err,
			result
		) {
			console.log(err);
			result.should.equal(path.resolve(fixture, "pkg/dir/index.js"));
			done();
		});
	});
	it("should resolve module names", function(done) {
		pnpApi.mocks.set("pkg", path.resolve(fixture, "pkg"));
		resolver.resolve({}, fixture, "pkg", {}, function(err, result) {
			result.should.equal(path.resolve(fixture, "pkg/index.js"));
			done();
		});
	});
	it("should not resolve symlinks", function(done) {
		pnpApi.mocks.set("pkg/symlink", path.resolve(fixture, "pkg/symlink"));
		resolver.resolve({}, fixture, "pkg/symlink", {}, function(err, result) {
			result.should.equal(path.resolve(fixture, "pkg/symlink/index.js"));
			done();
		});
	});
	it("should properly deal with other extensions", function(done) {
		pnpApi.mocks.set("pkg/typescript", path.resolve(fixture, "pkg/typescript"));
		resolver.resolve({}, fixture, "pkg/typescript", {}, function(err, result) {
			result.should.equal(path.resolve(fixture, "pkg/typescript/index.ts"));
			done();
		});
	});
});
