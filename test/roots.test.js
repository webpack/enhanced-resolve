"use strict";

const assert = require("assert");
const fs = require("fs");

const path = require("path");
const CachedInputFileSystem = require("../lib/CachedInputFileSystem");
const ResolverFactory = require("../lib/ResolverFactory");
const { describe, it } = require("./_runner");

describe("roots", () => {
	const fixtures = path.resolve(__dirname, "fixtures");
	const fileSystem = new CachedInputFileSystem(fs, 4000);
	const resolver = ResolverFactory.createResolver({
		extensions: [".js"],
		alias: {
			foo: "/fixtures",
		},
		roots: [__dirname, fixtures],
		fileSystem,
	});

	const resolverPreferAbsolute = ResolverFactory.createResolver({
		extensions: [".js"],
		alias: {
			foo: "/fixtures",
		},
		roots: [__dirname, fixtures],
		fileSystem,
		preferAbsolute: true,
		plugins: [
			{
				apply(resolver) {
					resolver.hooks.file.tap("Test", (request) => {
						if (/test.fixtures.*test.fixtures/.test(request.path)) {
							throw new Error("Simulate a fatal error in root path");
						}
					});
				},
			},
		],
	});

	const contextResolver = ResolverFactory.createResolver({
		roots: [__dirname],
		fileSystem,
		resolveToContext: true,
	});

	it("should respect roots option", (t, done) => {
		resolver.resolve({}, fixtures, "/fixtures/b.js", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			assert.deepStrictEqual(result, path.resolve(fixtures, "b.js"));
			done();
		});
	});

	it("should try another root option, if it exists", (t, done) => {
		resolver.resolve({}, fixtures, "/b.js", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			assert.deepStrictEqual(result, path.resolve(fixtures, "b.js"));
			done();
		});
	});

	it("should respect extension", (t, done) => {
		resolver.resolve({}, fixtures, "/fixtures/b", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			assert.deepStrictEqual(result, path.resolve(fixtures, "b.js"));
			done();
		});
	});

	it("should resolve in directory", (t, done) => {
		resolver.resolve(
			{},
			fixtures,
			"/fixtures/extensions/dir",
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				assert.deepStrictEqual(
					result,
					path.resolve(fixtures, "extensions/dir/index.js"),
				);
				done();
			},
		);
	});

	it("should respect aliases", (t, done) => {
		resolver.resolve({}, fixtures, "foo/b", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			assert.deepStrictEqual(result, path.resolve(fixtures, "b.js"));
			done();
		});
	});

	it("should support roots options with resolveToContext", (t, done) => {
		contextResolver.resolve(
			{},
			fixtures,
			"/fixtures/lib",
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				assert.deepStrictEqual(result, path.resolve(fixtures, "lib"));
				done();
			},
		);
	});

	it("should not work with relative path", (t, done) => {
		resolver.resolve({}, fixtures, "fixtures/b.js", {}, (err, result) => {
			if (!err) return done(new Error(`expect error, got ${result}`));
			assert.ok(err instanceof Error);
			done();
		});
	});

	it("should resolve an absolute path (prefer absolute)", (t, done) => {
		resolverPreferAbsolute.resolve(
			{},
			fixtures,
			path.join(fixtures, "b.js"),
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				assert.deepStrictEqual(result, path.resolve(fixtures, "b.js"));
				done();
			},
		);
	});

	it("should throw an error for empty requests (no root rewriting)", (t, done) => {
		// Empty request should produce an error, not a root rewrite.
		resolver.resolve({}, fixtures, "", {}, (err) => {
			assert.ok(err instanceof Error);
			done();
		});
	});

	it("should work falls through for relative requests (no root rewriting)", (t, done) => {
		// Relative request resolves normally (not via roots).
		resolver.resolve({}, fixtures, "./a.js", {}, (err, result) => {
			if (err) return done(err);
			assert.deepStrictEqual(result, path.join(fixtures, "a.js"));
			done();
		});
	});

	it("should rewrites absolute-style requests against roots", (t, done) => {
		// Absolute request "/a.js" should be rewritten to roots[0] + /a.js
		resolver.resolve({}, fixtures, "/a.js", {}, (err, result) => {
			if (err) return done(err);
			assert.deepStrictEqual(result, path.join(fixtures, "a.js"));
			done();
		});
	});
});
