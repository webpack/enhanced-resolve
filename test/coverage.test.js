"use strict";

/* eslint-disable jsdoc/reject-any-type */

const fs = require("fs");
const path = require("path");
const { CachedInputFileSystem, ResolverFactory } = require("../");
const resolve = require("../");

const fixtures = path.join(__dirname, "fixtures");
const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

describe("roots guard clauses", () => {
	// Integration checks for requests that RootsPlugin should ignore.
	const resolver = ResolverFactory.createResolver({
		extensions: [".js"],
		roots: [fixtures],
		fileSystem: nodeFileSystem,
	});

	it("falls through for empty requests (no root rewriting)", (done) => {
		// Empty request should produce a module-parse error, not a root rewrite.
		resolver.resolve({}, fixtures, "", {}, (err) => {
			expect(err).toBeInstanceOf(Error);
			done();
		});
	});

	it("falls through for relative requests (no root rewriting)", (done) => {
		// Relative request resolves normally (not via roots).
		resolver.resolve({}, fixtures, "./a.js", {}, (err, result) => {
			if (err) return done(err);
			expect(result).toEqual(path.join(fixtures, "a.js"));
			done();
		});
	});

	it("rewrites absolute-style requests against roots", (done) => {
		// Absolute request "/a.js" should be rewritten to roots[0] + /a.js
		resolver.resolve({}, fixtures, "/a.js", {}, (err, result) => {
			if (err) return done(err);
			expect(result).toEqual(path.join(fixtures, "a.js"));
			done();
		});
	});
});

describe("directory/file existence logging", () => {
	const resolver = ResolverFactory.createResolver({
		fileSystem: nodeFileSystem,
		extensions: [".js"],
	});

	it("logs 'doesn't exist' when a directory is missing during resolution", (done) => {
		const log = [];
		resolver.resolve(
			{},
			fixtures,
			"./does-not-exist",
			{ log: (m) => log.push(m) },
			(err) => {
				expect(err).toBeInstanceOf(Error);
				expect(log.some((l) => l.includes("doesn't exist"))).toBe(true);
				done();
			},
		);
	});

	it("tracks missing directories in resolveContext.missingDependencies", (done) => {
		const missingDependencies = new Set();
		resolver.resolve(
			{},
			fixtures,
			"./does-not-exist",
			{ missingDependencies },
			(err) => {
				expect(err).toBeInstanceOf(Error);
				expect(missingDependencies.size).toBeGreaterThan(0);
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

	it("preserves unique fragments when parsing requests", (done) => {
		resolver.resolve({}, fixtures, "./a.js#frag", {}, (err, result) => {
			if (err) return done(err);
			expect(result).toBe(`${path.join(fixtures, "a.js")}#frag`);
			done();
		});
	});

	it("preserves queries together with fragments", (done) => {
		resolver.resolve({}, fixtures, "./a.js?q#f", {}, (err, result) => {
			if (err) return done(err);
			expect(result).toBe(`${path.join(fixtures, "a.js")}?q#f`);
			done();
		});
	});
});

describe("RestrictionsPlugin logs", () => {
	it("logs when path is outside of a string restriction", (done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			extensions: [".js"],
			restrictions: ["/definitely/not/here"],
		});
		const log = [];
		resolver.resolve(
			{},
			fixtures,
			"./a.js",
			{ log: (m) => log.push(m) },
			(err) => {
				expect(err).toBeInstanceOf(Error);
				expect(
					log.some((l) => l.includes("is not inside of the restriction")),
				).toBe(true);
				done();
			},
		);
	});

	it("logs when path does not match a regex restriction", (done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			extensions: [".js"],
			restrictions: [/\.ts$/],
		});
		const log = [];
		resolver.resolve(
			{},
			fixtures,
			"./a.js",
			{ log: (m) => log.push(m) },
			(err) => {
				expect(err).toBeInstanceOf(Error);
				expect(
					log.some((l) => l.includes("doesn't match the restriction")),
				).toBe(true);
				done();
			},
		);
	});
});

// cspell:ignore Hierachic
describe("CloneBasenamePlugin + deprecated alias re-export", () => {
	it("exports ModulesInHierarchicalDirectoriesPlugin as a deprecated alias", () => {
		const alias = require("../lib/ModulesInHierachicDirectoriesPlugin");
		const target = require("../lib/ModulesInHierarchicalDirectoriesPlugin");

		expect(alias).toBe(target);
	});
});

describe("identifier.parseIdentifier returns null on malformed input", () => {
	it("returns null for a single null-byte input", () => {
		const { parseIdentifier } = require("../lib/util/identifier");

		expect(parseIdentifier("\0")).toBeNull();
	});
});

describe("util/fs readJson", () => {
	const { readJson } = require("../lib/util/fs");

	it("uses fileSystem.readJson when available and stripComments is false", async () => {
		const content = { name: "fast-path" };
		const fileSystem = /** @type {any} */ ({
			readJson(_p, callback) {
				callback(null, content);
			},
			readFile(_p, callback) {
				callback(new Error("should not be called"));
			},
		});
		const result = await readJson(fileSystem, "/a/package.json");
		expect(result).toEqual(content);
	});

	it("rejects if readJson yields an error", async () => {
		const fileSystem = /** @type {any} */ ({
			readJson(_p, callback) {
				callback(new Error("boom"));
			},
			readFile(_p, callback) {
				callback(null, Buffer.from("{}"));
			},
		});
		await expect(readJson(fileSystem, "/a/package.json")).rejects.toThrow(
			"boom",
		);
	});

	it("falls back to readFile when stripComments is true", async () => {
		const fileSystem = /** @type {any} */ ({
			readJson(_p, callback) {
				callback(new Error("should not be called"));
			},
			readFile(_p, callback) {
				callback(
					null,
					Buffer.from('{\n// comment\n"a": 1, /*x*/ "b": [1,2,],\n}'),
				);
			},
		});
		const result = await readJson(fileSystem, "/a/tsconfig.json", {
			stripComments: true,
		});
		expect(result).toEqual({ a: 1, b: [1, 2] });
	});

	it("falls back to readFile when readJson is unavailable", async () => {
		const fileSystem = /** @type {any} */ ({
			readFile(_p, callback) {
				callback(null, Buffer.from('{"hello": "world"}'));
			},
		});
		const result = await readJson(fileSystem, "/a/package.json");
		expect(result).toEqual({ hello: "world" });
	});

	it("rejects when readFile errors", async () => {
		const fileSystem = /** @type {any} */ ({
			readFile(_p, callback) {
				callback(new Error("read-fail"));
			},
		});
		await expect(readJson(fileSystem, "/a/package.json")).rejects.toThrow(
			"read-fail",
		);
	});
});

describe("browser entry points", () => {
	it("exposes process-browser nextTick and versions", (done) => {
		const processBrowser = require("../lib/util/process-browser");

		expect(processBrowser.versions).toEqual({});
		processBrowser.nextTick(
			(a, b) => {
				expect(a).toBe(1);
				expect(b).toBe(2);
				done();
			},
			1,
			2,
		);
	});

	it("exposes module-browser as an empty object", () => {
		const moduleBrowser = require("../lib/util/module-browser");

		expect(moduleBrowser).toEqual({});
	});
});

describe("getPaths.basename edge cases", () => {
	const getPaths = require("../lib/getPaths");

	it("returns null when the path has no separators", () => {
		expect(getPaths.basename("foo")).toBeNull();
	});

	it("returns the basename after the last forward slash", () => {
		expect(getPaths.basename("/a/b/c")).toBe("c");
	});

	it("returns the basename after the last backslash", () => {
		expect(getPaths.basename("a\\b\\c")).toBe("c");
	});

	it("picks the rightmost separator among mixed types", () => {
		expect(getPaths.basename("a/b\\c")).toBe("c");
		expect(getPaths.basename("a\\b/c")).toBe("c");
	});

	it("returns empty string when the path ends with a separator", () => {
		expect(getPaths.basename("a/")).toBe("");
		expect(getPaths.basename("a\\")).toBe("");
	});
});

describe("DescriptionFileUtils helpers", () => {
	const DescriptionFileUtils = require("../lib/DescriptionFileUtils");

	it("cdUp returns null for '/'", () => {
		expect(DescriptionFileUtils.cdUp("/")).toBeNull();
	});

	it("cdUp returns null for inputs without separators", () => {
		// cspell:ignore noslash
		expect(DescriptionFileUtils.cdUp("noslash")).toBeNull();
	});

	it("cdUp returns '/' when stripping the last directory", () => {
		expect(DescriptionFileUtils.cdUp("/foo")).toBe("/");
	});

	it("cdUp descends one level for posix and win paths", () => {
		expect(DescriptionFileUtils.cdUp("/a/b/c")).toBe("/a/b");
		expect(DescriptionFileUtils.cdUp("C:\\a\\b\\c")).toBe("C:\\a\\b");
	});

	it("getField returns undefined for empty content", () => {
		expect(
			DescriptionFileUtils.getField(/** @type {any} */ (null), "x"),
		).toBeUndefined();
	});

	it("getField walks an array field path", () => {
		const data = { a: { b: { c: 42 } } };
		expect(
			DescriptionFileUtils.getField(/** @type {any} */ (data), ["a", "b", "c"]),
		).toBe(42);
	});

	it("getField returns the deep value or null when path is broken mid-traversal", () => {
		expect(
			DescriptionFileUtils.getField(/** @type {any} */ ({ a: 1 }), ["a", "b"]),
		).toBeNull();
	});

	it("getField returns the field value for a string field", () => {
		expect(
			DescriptionFileUtils.getField(/** @type {any} */ ({ name: "x" }), "name"),
		).toBe("x");
	});
});

describe("resolver resolves request without a fragment or module marker", () => {
	// Exercises the LogInfoPlugin false-valued branches by resolving a request
	// that has no directory/module/query/fragment/descriptionFile attached.
	const LogInfoPlugin = require("../lib/LogInfoPlugin");

	it("runs without logging query/fragment/module/directory lines", (done) => {
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
				expect(log.some((l) => l.includes("[file] Resolving in"))).toBe(true);
				expect(log.some((l) => l.includes("Request is a directory"))).toBe(
					false,
				);
				expect(log.some((l) => l.includes("Request is an module"))).toBe(false);
				done();
			},
		);
	});
});

// A convenience sanity check that the full top-level resolve() works.
describe("top-level resolve()", () => {
	it("resolves a fixture with the default node resolver", (done) => {
		resolve(fixtures, "./a.js", (err, result) => {
			if (err) return done(err);
			expect(result).toEqual(path.join(fixtures, "a.js"));
			done();
		});
	});
});
