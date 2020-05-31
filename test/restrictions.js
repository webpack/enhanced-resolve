require("should");
const path = require("path");
const fs = require("fs");
const ResolverFactory = require("../lib/ResolverFactory");
const CachedInputFileSystem = require("../lib/CachedInputFileSystem");

const fixture = path.resolve(__dirname, "fixtures", "restrictions");
const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

it("should respect RegExp restriction", done => {
	const resolver = ResolverFactory.createResolver({
		extensions: [".js"],
		fileSystem: nodeFileSystem,
		restrictions: [/\.(sass|scss|css)$/]
	});

	resolver.resolve({}, fixture, "pck1", {}, (err, result) => {
		if (!err) throw new Error(`expect error, got ${result}`);
		err.should.be.instanceof(Error);
		err.message.should.match(/Resolve restriction \/.*\/ not passed/);
		done();
	});
});

it("should respect string restriction", done => {
	const resolver = ResolverFactory.createResolver({
		extensions: [".js"],
		fileSystem: nodeFileSystem,
		restrictions: [fixture]
	});

	resolver.resolve({}, fixture, "pck2", {}, (err, result) => {
		if (!err) throw new Error(`expect error, got ${result}`);
		err.should.be.instanceof(Error);
		err.message.should.match(/Resolve restriction ".*" not passed/);
		done();
	});
});
