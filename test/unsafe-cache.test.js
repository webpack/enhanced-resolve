const path = require("path");
const resolve = require("../");
const { obps } = require("./util/path-separator");

describe("unsafe-cache", () => {
	let cache;
	let cachedResolve;
	let context;
	let otherContext;

	beforeEach(() => {
		context = {
			some: "context"
		};
		otherContext = {
			someOther: "context"
		};
	});

	describe("with no other options", () => {
		beforeEach(() => {
			cache = {};
			cachedResolve = resolve.create({
				unsafeCache: cache
			});
		});
		it("should cache request", done => {
			cachedResolve(
				path.join(__dirname, "fixtures"),
				`m2${obps}b`,
				function (err, result) {
					if (err) return done(err);
					expect(Object.keys(cache)).toHaveLength(1);
					Object.keys(cache).forEach(function (key) {
						cache[key] = {
							path: "yep"
						};
					});
					cachedResolve(
						path.join(__dirname, "fixtures"),
						`m2${obps}b`,
						function (err, result) {
							if (err) return done(err);
							expect(result).toEqual("yep");
							done();
						}
					);
				}
			);
		});
		it("should not return from cache if context does not match", done => {
			cachedResolve(
				context,
				path.join(__dirname, "fixtures"),
				`m2${obps}b`,
				function (err, result) {
					if (err) return done(err);
					expect(Object.keys(cache)).toHaveLength(1);
					Object.keys(cache).forEach(function (key) {
						cache[key] = {
							path: "yep"
						};
					});
					cachedResolve(
						otherContext,
						path.join(__dirname, "fixtures"),
						`m2${obps}b`,
						function (err, result) {
							if (err) return done(err);
							expect(result).not.toEqual("yep");
							done();
						}
					);
				}
			);
		});
		it("should not return from cache if query does not match", done => {
			cachedResolve(
				path.join(__dirname, "fixtures"),
				`m2${obps}b?query`,
				function (err, result) {
					if (err) return done(err);
					expect(Object.keys(cache)).toHaveLength(1);
					Object.keys(cache).forEach(function (key) {
						cache[key] = {
							path: "yep"
						};
					});
					cachedResolve(
						path.join(__dirname, "fixtures"),
						`m2${obps}b?query2`,
						function (err, result) {
							if (err) return done(err);
							expect(result).not.toEqual("yep");
							done();
						}
					);
				}
			);
		});
	});

	describe("with cacheWithContext false", () => {
		beforeEach(() => {
			cache = {};
			cachedResolve = resolve.create({
				unsafeCache: cache,
				cacheWithContext: false
			});
		});
		it("should cache request", done => {
			cachedResolve(
				context,
				path.join(__dirname, "fixtures"),
				`m2${obps}b`,
				function (err, result) {
					if (err) return done(err);
					expect(Object.keys(cache)).toHaveLength(1);
					Object.keys(cache).forEach(function (key) {
						cache[key] = {
							path: "yep"
						};
					});
					cachedResolve(
						context,
						path.join(__dirname, "fixtures"),
						`m2${obps}b`,
						function (err, result) {
							if (err) return done(err);
							expect(result).toEqual("yep");
							done();
						}
					);
				}
			);
		});
		it("should return from cache even if context does not match", done => {
			cachedResolve(
				context,
				path.join(__dirname, "fixtures"),
				`m2${obps}b`,
				function (err, result) {
					if (err) return done(err);
					expect(Object.keys(cache)).toHaveLength(1);
					Object.keys(cache).forEach(function (key) {
						cache[key] = {
							path: "yep"
						};
					});
					cachedResolve(
						otherContext,
						path.join(__dirname, "fixtures"),
						`m2${obps}b`,
						function (err, result) {
							if (err) return done(err);
							expect(result).toEqual("yep");
							done();
						}
					);
				}
			);
		});
	});
});
