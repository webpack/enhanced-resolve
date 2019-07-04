const path = require("path");
const fs = require("fs");
require("should");
const ResolverFactory = require("../lib/ResolverFactory");
const CachedInputFileSystem = require("../lib/CachedInputFileSystem");

const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

const resolver = ResolverFactory.createResolver({
	extensions: [".ts", ".js"],
	fileSystem: nodeFileSystem
});

const fixture = path.resolve(__dirname, "fixtures", "extensions");

describe("extensions", function() {
	it("should resolve according to order of provided extensions", function(done) {
		resolver.resolve({}, fixture, "./foo", {}, (err, result) => {
			if (err) return done(err);
			result.should.equal(path.resolve(fixture, "foo.ts"));
			done();
		});
	});
	it("should resolve according to order of provided extensions (dir index)", function(done) {
		resolver.resolve({}, fixture, "./dir", {}, (err, result) => {
			if (err) return done(err);
			result.should.equal(path.resolve(fixture, "dir", "index.ts"));
			done();
		});
	});
	it("should resolve according to main field in module root", function(done) {
		resolver.resolve({}, fixture, ".", {}, (err, result) => {
			if (err) return done(err);
			result.should.equal(path.resolve(fixture, "index.js"));
			done();
		});
	});
	it("should resolve single file module before directory", function(done) {
		resolver.resolve({}, fixture, "module", {}, (err, result) => {
			if (err) return done(err);
			result.should.equal(path.resolve(fixture, "node_modules/module.js"));
			done();
		});
	});
});
