"use strict";

const assert = require("assert");
const fs = require("fs");

const path = require("path");
const { CachedInputFileSystem, ResolverFactory } = require("../");
const resolve = require("../");
const { describe, it } = require("./_runner");

const fixtures = path.join(__dirname, "fixtures");
const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

describe("directory/file existence logging", () => {
	const resolver = ResolverFactory.createResolver({
		fileSystem: nodeFileSystem,
		extensions: [".js"],
	});

	it("logs 'doesn't exist' when a directory is missing during resolution", (t, done) => {
		const log = [];
		resolver.resolve(
			{},
			fixtures,
			"./does-not-exist",
			{ log: (m) => log.push(m) },
			(err) => {
				assert.ok(err instanceof Error);
				assert.strictEqual(
					log.some((l) => l.includes("doesn't exist")),
					true,
				);
				done();
			},
		);
	});

	it("tracks missing directories in resolveContext.missingDependencies", (t, done) => {
		const missingDependencies = new Set();
		resolver.resolve(
			{},
			fixtures,
			"./does-not-exist",
			{ missingDependencies },
			(err) => {
				assert.ok(err instanceof Error);
				assert.ok(missingDependencies.size > 0);
				done();
			},
		);
	});
});

describe("fragment handling (ParsePlugin)", () => {
	const resolver = ResolverFactory.createResolver({
		fileSystem: nodeFileSystem,
		extensions: [".js"],
	});

	it("preserves unique fragments when parsing requests", (t, done) => {
		resolver.resolve({}, fixtures, "./a.js#frag", {}, (err, result) => {
			if (err) return done(err);
			assert.strictEqual(result, `${path.join(fixtures, "a.js")}#frag`);
			done();
		});
	});

	it("preserves queries together with fragments", (t, done) => {
		resolver.resolve({}, fixtures, "./a.js?q#f", {}, (err, result) => {
			if (err) return done(err);
			assert.strictEqual(result, `${path.join(fixtures, "a.js")}?q#f`);
			done();
		});
	});
});

describe("resolver resolves request without a fragment or module marker", () => {
	// Exercises the LogInfoPlugin false-valued branches by resolving a request
	// that has no directory/module/query/fragment/descriptionFile attached.
	const LogInfoPlugin = require("../lib/LogInfoPlugin");

	it("runs without logging query/fragment/module/directory lines", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			extensions: [".js"],
			plugins: [new LogInfoPlugin("file")],
		});
		const log = [];
		resolver.resolve(
			{},
			fixtures,
			"./a.js",
			{ log: (m) => log.push(m) },
			(err) => {
				if (err) return done(err);
				// The "file" hook sees a request where module/directory are false and
				// query/fragment are empty — so these branches are skipped.
				assert.strictEqual(
					log.some((l) => l.includes("[file] Resolving in")),
					true,
				);
				assert.strictEqual(
					log.some((l) => l.includes("Request is a directory")),
					false,
				);
				assert.strictEqual(
					log.some((l) => l.includes("Request is an module")),
					false,
				);
				done();
			},
		);
	});
});

// A convenience sanity check that the full top-level resolve() works.
describe("top-level resolve()", () => {
	it("resolves a fixture with the default node resolver", (t, done) => {
		resolve(fixtures, "./a.js", (err, result) => {
			if (err) return done(err);
			assert.deepStrictEqual(result, path.join(fixtures, "a.js"));
			done();
		});
	});
});

describe("resolving a directory as a file (FileExistsPlugin 'is not a file' branch)", () => {
	it("emits an error when enforceExtension matches a directory", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			enforceExtension: true,
			extensions: [".js"],
		});
		resolver.resolve({}, fixtures, "./directory-default", {}, (err) => {
			assert.ok(err instanceof Error);
			done();
		});
	});
});
