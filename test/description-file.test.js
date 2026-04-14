"use strict";

/* eslint-disable jsdoc/reject-any-type */

const fs = require("fs");
const path = require("path");
const { CachedInputFileSystem, ResolverFactory } = require("../");

const fixtures = path.join(__dirname, "fixtures");
const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

/**
 * Wrap a graceful-fs-style file system to drop `readJson`, forcing the
 * resolver to go through the JSONC parsing fallback path.
 * @returns {import("../lib/Resolver").FileSystem} filesystem without readJson
 */
function fsWithoutReadJson() {
	return /** @type {any} */ ({
		stat: fs.stat.bind(fs),
		statSync: fs.statSync.bind(fs),
		readdir: fs.readdir.bind(fs),
		readdirSync: fs.readdirSync.bind(fs),
		readFile: fs.readFile.bind(fs),
		readFileSync: fs.readFileSync.bind(fs),
		readlink: fs.readlink.bind(fs),
		readlinkSync: fs.readlinkSync.bind(fs),
		lstat: fs.lstat.bind(fs),
		lstatSync: fs.lstatSync.bind(fs),
		realpath: fs.realpath.bind(fs),
		realpathSync: fs.realpathSync.bind(fs),
	});
}

describe("description file (readFile fallback)", () => {
	it("surfaces 'No content in file' when the description file is empty", (done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: fsWithoutReadJson(),
			extensions: [".js"],
		});
		resolver.resolve(
			{},
			path.join(fixtures, "empty-description-file"),
			".",
			{},
			(err) => {
				expect(err).toBeInstanceOf(Error);
				expect(/** @type {Error} */ (err).message).toMatch(
					/No content in file|Unexpected end of JSON|Can't resolve/,
				);
				done();
			},
		);
	});

	it("surfaces a parse error when the description file contains invalid JSON", (done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: fsWithoutReadJson(),
			extensions: [".js"],
		});
		resolver.resolve(
			{},
			path.join(fixtures, "bad-description-file"),
			".",
			{},
			(err) => {
				expect(err).toBeInstanceOf(Error);
				done();
			},
		);
	});

	it("resolves through the readFile path when readJson is not available", (done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: fsWithoutReadJson(),
			extensions: [".js"],
		});
		resolver.resolve({}, fixtures, "m1/a", {}, (err, result) => {
			if (err) return done(err);
			expect(result).toEqual(path.join(fixtures, "node_modules/m1/a.js"));
			done();
		});
	});
});

describe("self-reference resolution", () => {
	const selfPkg = path.join(fixtures, "self-reference-pkg");

	it("resolves a package's own name via the exports field", (done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			conditionNames: ["node"],
			exportsFields: ["exports"],
		});
		resolver.resolve({}, selfPkg, "self-pkg", {}, (err, result) => {
			if (err) return done(err);
			expect(result).toEqual(path.join(selfPkg, "index.js"));
			done();
		});
	});

	it("resolves a sub-path via self-reference + exports", (done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			conditionNames: ["node"],
			exportsFields: ["exports"],
		});
		resolver.resolve({}, selfPkg, "self-pkg/sub", {}, (err, result) => {
			if (err) return done(err);
			expect(result).toEqual(path.join(selfPkg, "sub.js"));
			done();
		});
	});

	it("falls through when the request is not the package name", (done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			extensions: [".js"],
			conditionNames: ["node"],
			exportsFields: ["exports"],
		});
		resolver.resolve({}, selfPkg, "./index", {}, (err, result) => {
			if (err) return done(err);
			expect(result).toEqual(path.join(selfPkg, "index.js"));
			done();
		});
	});
});
