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
			".js": [".ts", ".js"]
		}
	});

	it("should alias fully specified file", done => {
		resolver.resolve({}, fixture, "./index.js", {}, (err, result) => {
			if (err) return done(err);
			should(result).be.eql(path.resolve(fixture, "index.ts"));
			done();
		});
	});

	it("should alias specified extension", done => {
		resolver.resolve({}, fixture, "./dir", {}, (err, result) => {
			if (err) return done(err);
			should(result).be.eql(path.resolve(fixture, "dir", "index.ts"));
			done();
		});
	});

	it("should result successfully without aliasing #1", done => {
		resolver.resolve({}, fixture, "./dir2", {}, (err, result) => {
			if (err) return done(err);
			should(result).be.eql(path.resolve(fixture, "dir2", "index.js"));
			done();
		});
	});

	it("should result successfully without aliasing #2", done => {
		resolver.resolve({}, fixture, "./dir2/index.js", {}, (err, result) => {
			if (err) return done(err);
			should(result).be.eql(path.resolve(fixture, "dir2", "index.js"));
			done();
		});
	});

	describe("should result successfully without alias array", () => {
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
			resolver.resolve({}, fixture, "./dir2/index.js", {}, (err, result) => {
				if (err) return done(err);
				should(result).be.eql(path.resolve(fixture, "dir2", "index.js"));
				done();
			});
		});
	});
});
