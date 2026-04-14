"use strict";

/* eslint-disable jsdoc/reject-any-type */

const { AsyncSeriesBailHook } = require("tapable");
const UnsafeCachePlugin = require("../lib/UnsafeCachePlugin");

/**
 * @param {(req: any) => boolean} filterPredicate filter predicate
 * @param {Record<string, any>} cache cache object
 * @param {boolean} withContext whether to cache with context
 * @returns {any} a minimal plugin harness
 */
function setup(filterPredicate, cache, withContext) {
	const source = new AsyncSeriesBailHook(
		["request", "resolveContext"],
		"ucSource",
	);
	const target = new AsyncSeriesBailHook(
		["request", "resolveContext"],
		"ucTarget",
	);
	const doResolveImplementations = [];
	const resolver = {
		ensureHook: (h) => h,
		getHook: (h) => h,
		doResolve(hook, req, msg, ctx, cb) {
			const impl = doResolveImplementations.shift();
			if (!impl) return cb();
			impl(hook, req, msg, ctx, cb);
		},
	};
	const plugin = new UnsafeCachePlugin(
		source,
		filterPredicate,
		cache,
		withContext,
		target,
	);
	plugin.apply(resolver);
	return { source, target, resolver, cache, doResolveImplementations };
}

describe("UnsafeCachePlugin coverage gaps", () => {
	it("passes through without caching when filterPredicate returns false", (done) => {
		const harness = setup(() => false, {}, false);
		const cachedRequest = { path: "/x", request: "./a" };
		harness.doResolveImplementations.push((hook, req, msg, ctx, cb) => {
			expect(hook).toBe(harness.target);
			cb(null, cachedRequest);
		});
		harness.source.callAsync(
			/** @type {any} */ (cachedRequest),
			{},
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBe(cachedRequest);
				// Cache should not be populated.
				expect(Object.keys(harness.cache)).toEqual([]);
				done();
			},
		);
	});

	it("returns a cached entry on a cache hit (non-yield)", (done) => {
		const cache = {};
		const harness = setup(() => true, cache, false);
		const req = { path: "/x", request: "./a" };
		// First call resolves and caches.
		harness.doResolveImplementations.push((hook, r, msg, ctx, cb) => {
			cb(null, /** @type {any} */ ({ path: "/x/a.js" }));
		});
		harness.source.callAsync(/** @type {any} */ (req), {}, (err, first) => {
			if (err) return done(err);
			expect(first).toEqual({ path: "/x/a.js" });
			expect(Object.keys(cache)).toHaveLength(1);
			// Second call should hit the cache — no new doResolve impl.
			harness.source.callAsync(/** @type {any} */ (req), {}, (err2, second) => {
				if (err2) return done(err2);
				expect(second).toBe(first);
				done();
			});
		});
	});

	it("yields a single cached non-array entry when resolveContext.yield is set", (done) => {
		const cachedRequest = /** @type {any} */ ({ path: "/cached" });
		const cache = { stuff: cachedRequest };
		const harness = setup(() => true, cache, false);
		// Intercept getCacheId output by forcing the cache key to match.
		const req = { path: "/x", request: "./a" };
		// Manually set a cache entry that matches whatever cacheId is generated.
		// Trigger one resolve first to populate the cache under the real id.
		harness.doResolveImplementations.push((hook, r, msg, ctx, cb) =>
			cb(null, cachedRequest),
		);
		harness.source.callAsync(
			/** @type {any} */ (req),
			{ yield: () => {} },
			(err) => {
				if (err) return done(err);
				// The cache is now populated with a yieldResult array for this key.
				// Now wipe the cache and set a non-array (string "cached" request)
				// to exercise the single-yield branch.
				const key = Object.keys(cache).find((k) => k !== "stuff");
				delete cache[key];
				// Pick a key likely to be used: produce one with a fresh request.
				const nextReq = { path: "/x", request: "./different-key" };
				// First resolve to populate a yield cache entry.
				harness.doResolveImplementations.push((hook, r, msg, ctx, cb) => {
					// yield nothing, but return a direct result.
					cb(null, cachedRequest);
				});
				harness.source.callAsync(
					/** @type {any} */ (nextReq),
					{ yield: () => {} },
					(err2) => {
						if (err2) return done(err2);
						const yielded = [];
						// Replace the cached array with a single (non-array) request,
						// then call through again. This exercises the `yield_(cacheEntry)` branch (line ~123).
						const cachedKeys = Object.keys(cache);
						for (const k of cachedKeys) {
							if (Array.isArray(cache[k])) cache[k] = cachedRequest;
						}
						// Now call again to hit the cache with a non-array entry.
						harness.source.callAsync(
							/** @type {any} */ (nextReq),
							{ yield: (r) => yielded.push(r) },
							(err3, result3) => {
								if (err3) return done(err3);
								expect(result3).toBeNull();
								expect(yielded).toEqual([cachedRequest]);
								done();
							},
						);
					},
				);
			},
		);
	});

	it("yields an array cached entry when resolveContext.yield is set", (done) => {
		const cache = {};
		const harness = setup(() => true, cache, false);
		const req = { path: "/x", request: "./yield-me" };

		harness.doResolveImplementations.push((hook, r, msg, ctx, cb) => {
			ctx.yield(/** @type {any} */ ({ path: "/y/1" }));
			ctx.yield(/** @type {any} */ ({ path: "/y/2" }));
			cb(null, null);
		});

		harness.source.callAsync(
			/** @type {any} */ (req),
			{ yield: () => {} },
			(err) => {
				if (err) return done(err);
				// Now call again — the array cache branch is taken.
				const out = [];
				harness.source.callAsync(
					/** @type {any} */ (req),
					{ yield: (r) => out.push(r) },
					(err2, result) => {
						if (err2) return done(err2);
						expect(result).toBeNull();
						expect(out).toHaveLength(2);
						done();
					},
				);
			},
		);
	});

	it("falls through when underlying resolver produces no result", (done) => {
		const cache = {};
		const harness = setup(() => true, cache, false);
		harness.doResolveImplementations.push((hook, r, msg, ctx, cb) => cb());
		harness.source.callAsync(
			/** @type {any} */ ({ path: "/x", request: "./missing" }),
			{},
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBeUndefined();
				// Nothing was cached.
				expect(Object.keys(cache)).toEqual([]);
				done();
			},
		);
	});

	it("propagates errors from the target resolver (non-yield)", (done) => {
		const cache = {};
		const harness = setup(() => true, cache, false);
		harness.doResolveImplementations.push((hook, r, msg, ctx, cb) =>
			cb(new Error("boom")),
		);
		harness.source.callAsync(
			/** @type {any} */ ({ path: "/x", request: "./err" }),
			{},
			(err) => {
				expect(err).toBeTruthy();
				expect(err.message).toBe("boom");
				done();
			},
		);
	});

	it("uses context in the cache key when withContext is true", (done) => {
		const cache = {};
		const harness = setup(() => true, cache, true);
		const req = {
			path: "/x",
			request: "./a",
			context: { marker: "one" },
		};
		harness.doResolveImplementations.push((hook, r, msg, ctx, cb) =>
			cb(null, /** @type {any} */ ({ path: "/one" })),
		);
		harness.source.callAsync(/** @type {any} */ (req), {}, (err, first) => {
			if (err) return done(err);
			expect(first).toEqual({ path: "/one" });
			// A different context yields a different cache key and triggers a second resolve.
			harness.doResolveImplementations.push((hook, r, msg, ctx, cb) =>
				cb(null, /** @type {any} */ ({ path: "/two" })),
			);
			harness.source.callAsync(
				/** @type {any} */ ({
					...req,
					context: { marker: "two" },
				}),
				{},
				(err2, second) => {
					if (err2) return done(err2);
					expect(second).toEqual({ path: "/two" });
					expect(Object.keys(cache)).toHaveLength(2);
					done();
				},
			);
		});
	});
});
