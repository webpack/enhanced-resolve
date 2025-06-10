"use strict";

const path = require("path");
const resolve = require("../");

describe("unsafe-cache", () => {
	let cache;
	let cachedResolve;
	let context;
	let otherContext;

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
});
