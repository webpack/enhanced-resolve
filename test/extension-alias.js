const path = require("path");
const fs = require("fs");
const should = require("should");

const CachedInputFileSystem = require("../lib/CachedInputFileSystem");
const ResolverFactory = require("../lib/ResolverFactory");

/** @typedef {import("../lib/util/entrypoints").ImportsField} ImportsField */

describe("extension-alias", () => {
	const fixture = path.resolve(__dirname, "fixtures", "extension-alias");
	const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

	const resolver = ResolverFactory.createResolver({
		extensions: [".js"],
		fileSystem: nodeFileSystem,
		mainFiles: ["index.js"],
		extensionAlias: {
			".js": [".ts", ".js"],
			".mjs": ".mts"
		}
	});

	it("should alias fully specified file", done => {
		resolver.resolve({}, fixture, "./index.js", {}, (err, result) => {
			if (err) return done(err);
			should(result).be.eql(path.resolve(fixture, "index.ts"));
			done();
		});
	});

	it("should alias fully specified file when there are two alternatives", done => {
		resolver.resolve({}, fixture, "./dir/index.js", {}, (err, result) => {
			if (err) return done(err);
			should(result).be.eql(path.resolve(fixture, "dir", "index.ts"));
			done();
		});
	});

	it("should also allow the second alternative", done => {
		resolver.resolve({}, fixture, "./dir2/index.js", {}, (err, result) => {
			if (err) return done(err);
			should(result).be.eql(path.resolve(fixture, "dir2", "index.js"));
			done();
		});
	});

	it("should support alias option without an array", done => {
		resolver.resolve({}, fixture, "./dir2/index.mjs", {}, (err, result) => {
			if (err) return done(err);
			should(result).be.eql(path.resolve(fixture, "dir2", "index.mts"));
			done();
		});
	});

	it("should not allow to fallback to the original extension or add extensions", done => {
		resolver.resolve({}, fixture, "./index.mjs", {}, (err, result) => {
			should(err).be.instanceOf(Error);
			done();
		});
	});

	describe("should not apply extension alias to extensions or mainFiles field", () => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			fileSystem: nodeFileSystem,
			mainFiles: ["index.js"],
			extensionAlias: {
				".js": []
			}
		});

		it("directory", done => {
			resolver.resolve({}, fixture, "./dir2", {}, (err, result) => {
				if (err) return done(err);
				should(result).be.eql(path.resolve(fixture, "dir2", "index.js"));
				done();
			});
		});

		it("file", done => {
			resolver.resolve({}, fixture, "./dir2/index", {}, (err, result) => {
				if (err) return done(err);
				should(result).be.eql(path.resolve(fixture, "dir2", "index.js"));
				done();
			});
		});
	});
});
