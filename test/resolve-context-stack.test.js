"use strict";

const fs = require("fs");
const path = require("path");
const { CachedInputFileSystem, ResolverFactory } = require("../");

const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

const fixture = path.resolve(__dirname, "fixtures", "extensions");

describe("resolveContext.stack", () => {
	const resolver = ResolverFactory.createResolver({
		extensions: [".ts", ".js"],
		fileSystem: nodeFileSystem,
	});

	it("should resolve when no stack is supplied", (done) => {
		resolver.resolve({}, fixture, "./foo", {}, (err, result) => {
			if (err) return done(err);
			expect(result).toBeTruthy();
			done();
		});
	});

	it("should resolve when an empty StackEntry is supplied as stack", (done) => {
		resolver.resolve(
			{},
			fixture,
			"./foo",
			{ stack: new Set() },
			(err, result) => {
				if (err) return done(err);
				expect(result).toBeTruthy();
				done();
			},
		);
	});

	it("should resolve when a non-empty Set is supplied as stack", (done) => {
		// The values below are arbitrary tokens that must not collide with any
		// real `resolve` step. Providing them exercises the code path where a
		// caller pre-seeds the recursion-tracking stack.
		resolver.resolve(
			{},
			fixture,
			"./foo",
			{ stack: new Set(["custom-entry-1", "custom-entry-2"]) },
			(err, result) => {
				if (err) return done(err);
				expect(result).toBeTruthy();
				done();
			},
		);
	});

	it("should detect recursion against entries pre-seeded in the stack", (done) => {
		// The first stack entry that `resolve` pushes for this request is
		// `resolve: (…fixture…) ./foo`. Pre-seeding an identical string in
		// the context must trigger the recursion guard and abort the resolve.
		const preSeededEntry = `resolve: (${fixture}) ./foo`;
		resolver.resolve(
			{},
			fixture,
			"./foo",
			{ stack: new Set([preSeededEntry]) },
			(err) => {
				expect(err).toBeTruthy();
				expect(
					/** @type {Error & { recursion?: boolean }} */ (err).recursion,
				).toBe(true);
				done();
			},
		);
	});

	it("should detect recursion against Set entries at deeper resolve steps", (done) => {
		// `parsedResolve` runs after the top-level `resolve` hook, so
		// pre-seeding its entry only triggers recursion at a deeper
		// `doResolve` call. This exercises the path where the legacy Set
		// needs to be propagated through the StackEntry chain, not just
		// checked on the first call.
		const deeperEntry = `parsedResolve: (${fixture}) ./foo`;
		resolver.resolve(
			{},
			fixture,
			"./foo",
			{ stack: new Set([deeperEntry]) },
			(err) => {
				expect(err).toBeTruthy();
				expect(
					/** @type {Error & { recursion?: boolean }} */ (err).recursion,
				).toBe(true);
				done();
			},
		);
	});

	// Reset patterns for the StackEntry API. With the legacy Set the canonical
	// reset between resolve calls was assigning `stack = new Set()` on a reused
	// context. StackEntry isn't user-constructible, so the equivalent reset is
	// either omitting `stack` or assigning `undefined`. Both forms must clear
	// any prior pre-seeded entries so a follow-up resolve no longer recurses.

	it("should reset the stack by assigning `undefined` (StackEntry equivalent of `new Set()`)", (done) => {
		// First call: pre-seed an entry that triggers recursion immediately.
		// Reuse the same `ctx` object on the second call after clearing the
		// field — the resolve must succeed because the seeded entry is gone.
		/** @type {import("../").ResolveContext} */
		const ctx = { stack: new Set([`resolve: (${fixture}) ./foo`]) };
		resolver.resolve({}, fixture, "./foo", ctx, (err) => {
			expect(err).toBeTruthy();
			expect(
				/** @type {Error & { recursion?: boolean }} */ (err).recursion,
			).toBe(true);

			ctx.stack = undefined;
			resolver.resolve({}, fixture, "./foo", ctx, (err2, result) => {
				if (err2) return done(err2);
				expect(result).toBeTruthy();
				done();
			});
		});
	});

	it("should reset the stack by assigning a fresh `new Set()` on a reused context", (done) => {
		// Same pattern, but using the legacy Set form for the reset to confirm
		// back-compat: a fresh empty Set clears the recursion guard just like
		// `undefined` does.
		/** @type {import("../").ResolveContext} */
		const ctx = { stack: new Set([`resolve: (${fixture}) ./foo`]) };
		resolver.resolve({}, fixture, "./foo", ctx, (err) => {
			expect(err).toBeTruthy();
			expect(
				/** @type {Error & { recursion?: boolean }} */ (err).recursion,
			).toBe(true);

			ctx.stack = new Set();
			resolver.resolve({}, fixture, "./foo", ctx, (err2, result) => {
				if (err2) return done(err2);
				expect(result).toBeTruthy();
				done();
			});
		});
	});

	// Plugin pattern: a cache plugin (e.g. webpack's ResolverCachePlugin)
	// taps into a hook and, on a cache miss, re-issues a fresh
	// `resolver.resolve()` to populate the cache. The inner call needs to
	// preserve the parent context (log, deps, yield) but start with an
	// empty recursion-tracking stack — otherwise it inherits the outer
	// chain and the guard fires on the first inner step (the same
	// `resolve: (path) request` it just pushed).
	//
	// Old API: `{ ...resolveContext, stack: new Set() }`.
	// New API (works today, future-proof once Set support is dropped):
	// `{ ...resolveContext, stack: undefined }`.
	describe("re-issuing resolves from inside a hook (cache-plugin pattern)", () => {
		/**
		 * @param {boolean} resetStack whether the plugin clears `stack`
		 * @returns {import("../").Resolver} resolver
		 */
		const buildReplayResolver = (resetStack) => {
			let didReplay = false;
			return ResolverFactory.createResolver({
				extensions: [".ts", ".js"],
				fileSystem: nodeFileSystem,
				plugins: [
					{
						/** @param {import("../").Resolver} r resolver */
						apply(r) {
							const target = r.ensureHook("parsed-resolve");
							r.getHook("resolve").tapAsync(
								"ReplayPlugin",
								(request, resolveContext, callback) => {
									if (didReplay) {
										// Inner pass: continue normally so the test
										// actually finishes its resolve.
										return r.doResolve(
											target,
											request,
											null,
											resolveContext,
											callback,
										);
									}
									didReplay = true;
									r.resolve(
										/** @type {import("../").Context} */
										(request.context || {}),
										/** @type {string} */ (request.path),
										/** @type {string} */ (request.request),
										resetStack
											? { ...resolveContext, stack: undefined }
											: resolveContext,
										(err, _result, fullResult) => {
											if (err) return callback(err);
											callback(null, fullResult);
										},
									);
								},
							);
						},
					},
				],
			});
		};

		it("succeeds when the plugin resets `stack` to undefined before re-issuing", (done) => {
			buildReplayResolver(true).resolve(
				{},
				fixture,
				"./foo",
				{},
				(err, result) => {
					if (err) return done(err);
					expect(result).toBeTruthy();
					done();
				},
			);
		});

		it("trips the recursion guard if the plugin forgets to reset `stack`", (done) => {
			// Negative control: confirms the reset above isn't a no-op.
			// Without it, the inner `resolver.resolve()` inherits the outer
			// chain, sees its own `resolve: (...)` entry already on the stack,
			// and aborts.
			buildReplayResolver(false).resolve({}, fixture, "./foo", {}, (err) => {
				expect(err).toBeTruthy();
				expect(
					/** @type {Error & { recursion?: boolean }} */ (err).recursion,
				).toBe(true);
				done();
			});
		});
	});
});
