"use strict";

const assert = require("assert");
const fs = require("fs");

/* eslint-disable jsdoc/reject-any-type */

const path = require("path");
const { CachedInputFileSystem, ResolverFactory } = require("../");
const { describe, it } = require("./_runner");

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
	it("surfaces 'No content in file' when the description file is empty", (t, done) => {
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
				assert.ok(err instanceof Error);
				assert.match(
					/** @type {Error} */ (err).message,
					/No content in file|Unexpected end of JSON|Can't resolve/,
				);
				done();
			},
		);
	});

	it("surfaces a parse error when the description file contains invalid JSON", (t, done) => {
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
				assert.ok(err instanceof Error);
				done();
			},
		);
	});

	it("resolves through the readFile path when readJson is not available", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: fsWithoutReadJson(),
			extensions: [".js"],
		});
		resolver.resolve({}, fixtures, "m1/a", {}, (err, result) => {
			if (err) return done(err);
			assert.deepStrictEqual(
				result,
				path.join(fixtures, "node_modules/m1/a.js"),
			);
			done();
		});
	});
});

describe("self-reference resolution", () => {
	const selfPkg = path.join(fixtures, "self-reference-pkg");

	it("resolves a package's own name via the exports field", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			conditionNames: ["node"],
			exportsFields: ["exports"],
		});
		resolver.resolve({}, selfPkg, "self-pkg", {}, (err, result) => {
			if (err) return done(err);
			assert.deepStrictEqual(result, path.join(selfPkg, "index.js"));
			done();
		});
	});

	it("resolves a sub-path via self-reference + exports", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			conditionNames: ["node"],
			exportsFields: ["exports"],
		});
		resolver.resolve({}, selfPkg, "self-pkg/sub", {}, (err, result) => {
			if (err) return done(err);
			assert.deepStrictEqual(result, path.join(selfPkg, "sub.js"));
			done();
		});
	});

	it("falls through when the request is not the package name", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			extensions: [".js"],
			conditionNames: ["node"],
			exportsFields: ["exports"],
		});
		resolver.resolve({}, selfPkg, "./index", {}, (err, result) => {
			if (err) return done(err);
			assert.deepStrictEqual(result, path.join(selfPkg, "index.js"));
			done();
		});
	});
});

describe("self-reference negative case", () => {
	it("does not self-reference when the package name doesn't match the request prefix", (t, done) => {
		const selfPkg = path.join(fixtures, "self-reference-pkg");
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			conditionNames: ["node"],
			exportsFields: ["exports"],
			fileSystem: nodeFileSystem,
		});
		resolver.resolve({}, selfPkg, "other-pkg", {}, (err) => {
			assert.ok(err instanceof Error);
			done();
		});
	});
});
