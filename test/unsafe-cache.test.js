"use strict";

const path = require("path");
const resolve = require("../");

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

		it("should cache request", (done) => {
			cachedResolve(
				path.join(__dirname, "fixtures"),
				"m2/b",
				(err, _result) => {
					if (err) return done(err);
					expect(Object.keys(cache)).toHaveLength(1);
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
							expect(result).toBe("yep");
							done();
						},
					);
				},
			);
		});

		it("should not return from cache if context does not match", (done) => {
			cachedResolve(
				context,
				path.join(__dirname, "fixtures"),
				"m2/b",
				(err, _result) => {
					if (err) return done(err);
					expect(Object.keys(cache)).toHaveLength(1);
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
							expect(result).not.toBe("yep");
							done();
						},
					);
				},
			);
		});

		it("should not return from cache if query does not match", (done) => {
			cachedResolve(
				path.join(__dirname, "fixtures"),
				"m2/b?query",
				(err, _result) => {
					if (err) return done(err);
					expect(Object.keys(cache)).toHaveLength(1);
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
							expect(result).not.toBe("yep");
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

		it("should cache request", (done) => {
			cachedResolve(
				context,
				path.join(__dirname, "fixtures"),
				"m2/b",
				(err, _result) => {
					if (err) return done(err);
					expect(Object.keys(cache)).toHaveLength(1);
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
							expect(result).toBe("yep");
							done();
						},
					);
				},
			);
		});

		it("should return from cache even if context does not match", (done) => {
			cachedResolve(
				context,
				path.join(__dirname, "fixtures"),
				"m2/b",
				(err, _result) => {
					if (err) return done(err);
					expect(Object.keys(cache)).toHaveLength(1);
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
							expect(result).toBe("yep");
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
			expect(cachedResolve(deepContext, "react")).toBe(rootReactTarget);
			poisonCache("cache-hit");
			expect(cachedResolve(shallowContext, "react")).toBe(rootReactTarget);
		});

		it("should reuse cached results for relative requests inside one package", () => {
			expect(cachedResolve(deepContext, "../../shared")).toBe(rootSharedTarget);
			poisonCache("cache-hit");
			expect(cachedResolve(shallowContext, "../shared")).toBe("cache-hit");
		});

		it("should not reuse cached results across package boundaries", () => {
			expect(cachedResolve(deepContext, "react")).toBe(rootReactTarget);
			poisonCache("cache-hit");
			expect(cachedResolve(nestedContext, "react")).toBe(nestedReactTarget);
		});

		it("should not reuse cached bare specifiers when a nested node_modules shadows the package root", () => {
			expect(cachedResolve(shallowContext, "react")).toBe(rootReactTarget);
			poisonCache("cache-hit");
			expect(cachedResolve(shadowedContext, "react")).toBe(shadowedReactTarget);
		});

		it("should keep relative requests distinct from bare specifiers", () => {
			expect(cachedResolve(deepContext, "../../shared")).toBe(rootSharedTarget);
			poisonCache("cache-hit");
			expect(cachedResolve(shallowContext, "shared")).toBe(
				rootSharedPackageTarget,
			);
		});
	});
});
