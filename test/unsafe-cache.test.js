"use strict";

const assert = require("assert");

const path = require("path");
const resolve = require("../");
const { beforeEach, describe, it } = require("./_runner");

describe("unsafe-cache", () => {
	let cache;
	let cachedResolve;
	let context;
	let otherContext;
	const fixturePath = path.join(
		__dirname,
		"fixtures",
		"unsafe-cache-normalization",
	);
	const nestedFixturePath = path.join(fixturePath, "packages", "nested");
	const shadowedContext = path.join(fixturePath, "src", "components");
	const deepContext = path.join(fixturePath, "src", "a", "b");
	const shallowContext = path.join(fixturePath, "src", "b");
	const nestedContext = path.join(nestedFixturePath, "src");
	const rootReactTarget = path.join(
		fixturePath,
		"node_modules",
		"react",
		"index.js",
	);
	const rootSharedTarget = path.join(fixturePath, "src", "shared", "index.js");
	const rootSharedPackageTarget = path.join(
		fixturePath,
		"node_modules",
		"shared",
		"index.js",
	);
	const nestedReactTarget = path.join(
		nestedFixturePath,
		"node_modules",
		"react",
		"index.js",
	);
	const shadowedReactTarget = path.join(
		fixturePath,
		"src",
		"components",
		"node_modules",
		"react",
		"index.js",
	);

	/**
	 * @param {string} value cache path value
	 * @returns {void}
	 */
	function poisonCache(value) {
		for (const key of Object.keys(cache)) {
			cache[key] = {
				path: value,
			};
		}
	}

	beforeEach(() => {
		context = {
			some: "context",
		};
		otherContext = {
			someOther: "context",
		};
	});

	describe("with no other options", () => {
		beforeEach(() => {
			cache = {};
			cachedResolve = resolve.create({
				unsafeCache: cache,
			});
		});

		it("should cache request", (t, done) => {
			cachedResolve(
				path.join(__dirname, "fixtures"),
				"m2/b",
				(err, _result) => {
					if (err) return done(err);
					assert.strictEqual(Object.keys(cache).length, 1);
					for (const key of Object.keys(cache)) {
						cache[key] = {
							path: "yep",
						};
					}
					cachedResolve(
						path.join(__dirname, "fixtures"),
						"m2/b",
						(err, result) => {
							if (err) return done(err);
							assert.strictEqual(result, "yep");
							done();
						},
					);
				},
			);
		});

		it("should not return from cache if context does not match", (t, done) => {
			cachedResolve(
				context,
				path.join(__dirname, "fixtures"),
				"m2/b",
				(err, _result) => {
					if (err) return done(err);
					assert.strictEqual(Object.keys(cache).length, 1);
					for (const key of Object.keys(cache)) {
						cache[key] = {
							path: "yep",
						};
					}
					cachedResolve(
						otherContext,
						path.join(__dirname, "fixtures"),
						"m2/b",
						(err, result) => {
							if (err) return done(err);
							assert.notStrictEqual(result, "yep");
							done();
						},
					);
				},
			);
		});

		it("should not return from cache if query does not match", (t, done) => {
			cachedResolve(
				path.join(__dirname, "fixtures"),
				"m2/b?query",
				(err, _result) => {
					if (err) return done(err);
					assert.strictEqual(Object.keys(cache).length, 1);
					for (const key of Object.keys(cache)) {
						cache[key] = {
							path: "yep",
						};
					}
					cachedResolve(
						path.join(__dirname, "fixtures"),
						"m2/b?query2",
						(err, result) => {
							if (err) return done(err);
							assert.notStrictEqual(result, "yep");
							done();
						},
					);
				},
			);
		});
	});

	describe("with cacheWithContext false", () => {
		beforeEach(() => {
			cache = {};
			cachedResolve = resolve.create({
				unsafeCache: cache,
				cacheWithContext: false,
			});
		});

		it("should cache request", (t, done) => {
			cachedResolve(
				context,
				path.join(__dirname, "fixtures"),
				"m2/b",
				(err, _result) => {
					if (err) return done(err);
					assert.strictEqual(Object.keys(cache).length, 1);
					for (const key of Object.keys(cache)) {
						cache[key] = {
							path: "yep",
						};
					}
					cachedResolve(
						context,
						path.join(__dirname, "fixtures"),
						"m2/b",
						(err, result) => {
							if (err) return done(err);
							assert.strictEqual(result, "yep");
							done();
						},
					);
				},
			);
		});

		it("should return from cache even if context does not match", (t, done) => {
			cachedResolve(
				context,
				path.join(__dirname, "fixtures"),
				"m2/b",
				(err, _result) => {
					if (err) return done(err);
					assert.strictEqual(Object.keys(cache).length, 1);
					for (const key of Object.keys(cache)) {
						cache[key] = {
							path: "yep",
						};
					}
					cachedResolve(
						otherContext,
						path.join(__dirname, "fixtures"),
						"m2/b",
						(err, result) => {
							if (err) return done(err);
							assert.strictEqual(result, "yep");
							done();
						},
					);
				},
			);
		});
	});

	describe("with package-normalized cache keys", () => {
		beforeEach(() => {
			cache = {};
			cachedResolve = resolve.create.sync({
				unsafeCache: cache,
			});
		});

		it("should keep bare specifier cache keys tied to the lookup directory", () => {
			assert.strictEqual(cachedResolve(deepContext, "react"), rootReactTarget);
			poisonCache("cache-hit");
			assert.strictEqual(
				cachedResolve(shallowContext, "react"),
				rootReactTarget,
			);
		});

		it("should reuse cached results for relative requests inside one package", () => {
			assert.strictEqual(
				cachedResolve(deepContext, "../../shared"),
				rootSharedTarget,
			);
			poisonCache("cache-hit");
			assert.strictEqual(
				cachedResolve(shallowContext, "../shared"),
				"cache-hit",
			);
		});

		it("should not reuse cached results across package boundaries", () => {
			assert.strictEqual(cachedResolve(deepContext, "react"), rootReactTarget);
			poisonCache("cache-hit");
			assert.strictEqual(
				cachedResolve(nestedContext, "react"),
				nestedReactTarget,
			);
		});

		it("should not reuse cached bare specifiers when a nested node_modules shadows the package root", () => {
			assert.strictEqual(
				cachedResolve(shallowContext, "react"),
				rootReactTarget,
			);
			poisonCache("cache-hit");
			assert.strictEqual(
				cachedResolve(shadowedContext, "react"),
				shadowedReactTarget,
			);
		});

		it("should keep relative requests distinct from bare specifiers", () => {
			assert.strictEqual(
				cachedResolve(deepContext, "../../shared"),
				rootSharedTarget,
			);
			poisonCache("cache-hit");
			assert.strictEqual(
				cachedResolve(shallowContext, "shared"),
				rootSharedPackageTarget,
			);
		});
	});

	describe("unsafe-cache more tests", () => {
		const fixtures = path.join(__dirname, "fixtures");

		it("passes through without caching when cachePredicate returns false", (t, done) => {
			const cache = {};
			const cachedResolve = resolve.create({
				// @ts-expect-error for tests
				unsafeCache: cache,
				cachePredicate: () => false,
			});
			cachedResolve(fixtures, "./a.js", (err, result) => {
				if (err) return done(err);
				assert.deepStrictEqual(result, path.join(fixtures, "a.js"));
				assert.strictEqual(Object.keys(cache).length, 0);
				done();
			});
		});

		it("returns a poisoned cache entry on a re-resolve (non-array branch)", (t, done) => {
			const cache = {};
			const cachedResolve = resolve.create({
				// @ts-expect-error for tests
				unsafeCache: cache,
			});
			cachedResolve(fixtures, "./a.js", (err) => {
				if (err) return done(err);
				for (const key of Object.keys(cache)) {
					cache[key] = { path: "poisoned" };
				}
				cachedResolve(fixtures, "./a.js", (err2, result) => {
					if (err2) return done(err2);
					assert.strictEqual(result, "poisoned");
					done();
				});
			});
		});
	});
});
