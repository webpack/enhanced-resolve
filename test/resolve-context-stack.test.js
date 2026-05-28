"use strict";

const assert = require("assert");
const fs = require("fs");
const { describe, it } = require("node:test");

const path = require("path");
const { CachedInputFileSystem, ResolverFactory } = require("../");

const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

const fixture = path.resolve(__dirname, "fixtures", "extensions");

describe("resolveContext.stack", () => {
	const resolver = ResolverFactory.createResolver({
		extensions: [".ts", ".js"],
		fileSystem: nodeFileSystem,
	});

	it("should resolve when no stack is supplied", (t, done) => {
		resolver.resolve({}, fixture, "./foo", {}, (err, result) => {
			if (err) return done(err);
			assert.ok(result);
			done();
		});
	});

	it("should resolve when an empty StackEntry is supplied as stack", (t, done) => {
		resolver.resolve(
			{},
			fixture,
			"./foo",
			{ stack: new Set() },
			(err, result) => {
				if (err) return done(err);
				assert.ok(result);
				done();
			},
		);
	});

	it("should resolve when a non-empty Set is supplied as stack", (t, done) => {
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
				assert.ok(result);
				done();
			},
		);
	});

	it("should detect recursion against entries pre-seeded in the stack", (t, done) => {
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
				assert.ok(err);
				assert.strictEqual(
					/** @type {Error & { recursion?: boolean }} */ (err).recursion,
					true,
				);
				done();
			},
		);
	});

	it("should detect recursion against Set entries at deeper resolve steps", (t, done) => {
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
				assert.ok(err);
				assert.strictEqual(
					/** @type {Error & { recursion?: boolean }} */ (err).recursion,
					true,
				);
				done();
			},
		);
	});

	// Reset patterns for the StackEntry API. With the legacy Set the canonical
	// reset between resolve calls was assigning `stack = new Set()` on a reused
	// context. StackEntry isn't user-constructible, so the equivalent reset is
	// either omitting `stack` or assigning `undefined`. Both forms must clear
	// any prior pre-seeded entries so a follow-up resolve no longer recurses.

	it("should reset the stack by assigning `undefined` (StackEntry equivalent of `new Set()`)", (t, done) => {
		// First call: pre-seed an entry that triggers recursion immediately.
		// Reuse the same `ctx` object on the second call after clearing the
		// field — the resolve must succeed because the seeded entry is gone.
		/** @type {import("../").ResolveContext} */
		const ctx = { stack: new Set([`resolve: (${fixture}) ./foo`]) };
		resolver.resolve({}, fixture, "./foo", ctx, (err) => {
			assert.ok(err);
			assert.strictEqual(
				/** @type {Error & { recursion?: boolean }} */ (err).recursion,
				true,
			);

			ctx.stack = undefined;
			resolver.resolve({}, fixture, "./foo", ctx, (err2, result) => {
				if (err2) return done(err2);
				assert.ok(result);
				done();
			});
		});
	});

	it("should reset the stack by assigning a fresh `new Set()` on a reused context", (t, done) => {
		// Same pattern, but using the legacy Set form for the reset to confirm
		// back-compat: a fresh empty Set clears the recursion guard just like
		// `undefined` does.
		/** @type {import("../").ResolveContext} */
		const ctx = { stack: new Set([`resolve: (${fixture}) ./foo`]) };
		resolver.resolve({}, fixture, "./foo", ctx, (err) => {
			assert.ok(err);
			assert.strictEqual(
				/** @type {Error & { recursion?: boolean }} */ (err).recursion,
				true,
			);

			ctx.stack = new Set();
			resolver.resolve({}, fixture, "./foo", ctx, (err2, result) => {
				if (err2) return done(err2);
				assert.ok(result);
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

		it("succeeds when the plugin resets `stack` to undefined before re-issuing", (t, done) => {
			buildReplayResolver(true).resolve(
				{},
				fixture,
				"./foo",
				{},
				(err, result) => {
					if (err) return done(err);
					assert.ok(result);
					done();
				},
			);
		});

		it("trips the recursion guard if the plugin forgets to reset `stack`", (t, done) => {
			// Negative control: confirms the reset above isn't a no-op.
			// Without it, the inner `resolver.resolve()` inherits the outer
			// chain, sees its own `resolve: (...)` entry already on the stack,
			// and aborts.
			buildReplayResolver(false).resolve({}, fixture, "./foo", {}, (err) => {
				assert.ok(err);
				assert.strictEqual(
					/** @type {Error & { recursion?: boolean }} */ (err).recursion,
					true,
				);
				done();
			});
		});
	});

	// Regression for #567: a plugin tapped on the `resolved` hook spreads
	// the stack and runs `String.prototype` methods on each entry. Pre-5.21
	// this worked because `stack` was a `Set<string>`; the iterator must
	// keep yielding strings so the snippet from the issue doesn't TypeError.
	it("supports `[...resolveContext.stack].find(a => a.includes(...))` (issue #567)", (t, done) => {
		/** @type {string | undefined} */
		let moduleEntry;
		const plugin = {
			/** @param {import("../").Resolver} r resolver */
			apply(r) {
				r.ensureHook("resolved").tapAsync(
					"DependencyDedupePlugin",
					(_resolved, resolveContext, callback) => {
						if (resolveContext.stack && moduleEntry === undefined) {
							const { stack } =
								/** @type {{ stack: Iterable<string> }} */
								(resolveContext);
							moduleEntry = [...stack].find((a) => a.includes("module:"));
						}
						callback();
					},
				);
			},
		};
		// Resolve a bare specifier so the resolver enters the `module` hook
		// and pushes a `module: (...)` entry onto the stack.
		const r = ResolverFactory.createResolver({
			extensions: [".ts", ".js"],
			modules: [path.resolve(__dirname, "fixtures/node_modules")],
			fileSystem: nodeFileSystem,
			plugins: [plugin],
		});
		r.resolve({}, fixture, "m1/a", {}, (err, result) => {
			if (err) return done(err);
			assert.ok(result);
			const entry = /** @type {string} */ (moduleEntry);
			assert.ok(entry);
			assert.strictEqual(typeof entry, "string");
			assert.match(entry, /^module: \(.+\) \.\//);
			// The exact regex from the issue's `DependencyDedupePlugin`
			// plugin: strip the `module: (path) ./` prefix and keep the
			// rest. For a `m1/a` request that yields `"m1/a"`.
			assert.strictEqual(
				entry.replace(/^(module: \(.+\) \.\/)(?=.+$)/, ""),
				"m1/a",
			);
			done();
		});
	});
});
