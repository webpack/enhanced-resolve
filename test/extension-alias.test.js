"use strict";

const fs = require("fs");
const path = require("path");

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
			".mjs": ".mts",
		},
	});

	it("should alias fully specified file", (done) => {
		resolver.resolve({}, fixture, "./index.js", {}, (err, result) => {
			if (err) return done(err);
			expect(result).toEqual(path.resolve(fixture, "index.ts"));
			done();
		});
	});

	it("should alias fully specified file when there are two alternatives", (done) => {
		resolver.resolve({}, fixture, "./dir/index.js", {}, (err, result) => {
			if (err) return done(err);
			expect(result).toEqual(path.resolve(fixture, "dir", "index.ts"));
			done();
		});
	});

	it("should also allow the second alternative", (done) => {
		resolver.resolve({}, fixture, "./dir2/index.js", {}, (err, result) => {
			if (err) return done(err);
			expect(result).toEqual(path.resolve(fixture, "dir2", "index.js"));
			done();
		});
	});

	it("should support alias option without an array", (done) => {
		resolver.resolve({}, fixture, "./dir2/index.mjs", {}, (err, result) => {
			if (err) return done(err);
			expect(result).toEqual(path.resolve(fixture, "dir2", "index.mts"));
			done();
		});
	});

	it("should not allow to fallback to the original extension or add extensions", (done) => {
		resolver.resolve({}, fixture, "./index.mjs", {}, (err, _result) => {
			expect(err).toBeInstanceOf(Error);
			done();
		});
	});

	describe("should not apply extension alias to extensions or mainFiles field", () => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			fileSystem: nodeFileSystem,
			mainFiles: ["index.js"],
			extensionAlias: {
				".js": [],
			},
		});

		it("directory", (done) => {
			resolver.resolve({}, fixture, "./dir2", {}, (err, result) => {
				if (err) return done(err);
				expect(result).toEqual(path.resolve(fixture, "dir2", "index.js"));
				done();
			});
		});

		it("file", (done) => {
			resolver.resolve({}, fixture, "./dir2/index", {}, (err, result) => {
				if (err) return done(err);
				expect(result).toEqual(path.resolve(fixture, "dir2", "index.js"));
				done();
			});
		});
	});
});

describe("extension-alias array logging", () => {
	const fixtures = path.join(__dirname, "fixtures");

	const ResolverFactory = require("../lib/ResolverFactory");
	const CachedInputFileSystem = require("../lib/CachedInputFileSystem");

	const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

	it("tries multiple extension aliases in order and logs each failure", (done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			extensionAlias: { ".js": [".missing1", ".missing2", ".js"] },
		});
		const log = [];
		resolver.resolve(
			{},
			fixtures,
			"./a.js",
			{ log: (m) => log.push(m) },
			(err, result) => {
				if (err) return done(err);
				expect(result).toEqual(path.join(fixtures, "a.js"));
				expect(
					log.some((l) => l.includes("Failed to alias from extension alias")),
				).toBe(true);
				done();
			},
		);
	});
});
