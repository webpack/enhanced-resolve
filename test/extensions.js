var path = require("path");
require("should");
var ResolverFactory = require("../lib/ResolverFactory");
var NodeJsInputFileSystem = require("../lib/NodeJsInputFileSystem");
var CachedInputFileSystem = require("../lib/CachedInputFileSystem");

var nodeFileSystem = new CachedInputFileSystem(
	new NodeJsInputFileSystem(),
	4000
);

var resolver = ResolverFactory.createResolver({
	extensions: [".ts", ".js"],
	fileSystem: nodeFileSystem
});

var fixture = path.resolve(__dirname, "fixtures", "extensions");

describe("extensions", function() {
	it("should resolve according to order of provided extensions", function(done) {
		resolver.resolve({}, fixture, "./foo", {}, function(err, result) {
			result.should.equal(path.resolve(fixture, "foo.ts"));
			done();
		});
	});
	it("should resolve according to order of provided extensions (dir index)", function(done) {
		resolver.resolve({}, fixture, "./dir", {}, function(err, result) {
			result.should.equal(path.resolve(fixture, "dir", "index.ts"));
			done();
		});
	});
	it("should resolve according to main field in module root", function(done) {
		resolver.resolve({}, fixture, ".", {}, function(err, result) {
			result.should.equal(path.resolve(fixture, "index.js"));
			done();
		});
	});
});
