require("should");

const path = require("path");
const fs = require("fs");
const { ResolverFactory, CachedInputFileSystem } = require("../");

const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

const resolver = ResolverFactory.createResolver({
	enforceCase: true,
	fileSystem: nodeFileSystem
});

const fixture = path.resolve(__dirname, "fixtures", "enforceCase");

describe("enforceCase", function() {
	it("should not resolve when wrong cased file", function(done) {
		resolver.resolve({}, fixture, "./FOO.js", {}, (err, result) => {
			if (!err) throw new Error("No error");
			err.should.be.instanceof(Error);
			done();
		});
	});
	it("should not resolve when wrong cased folder", function(done) {
		resolver.resolve({}, fixture, "./BAR/baz.js", {}, (err, result) => {
			if (!err) throw new Error("No error");
			err.should.be.instanceof(Error);
			done();
		});
	});
});
