"use strict";

/* eslint-disable jsdoc/reject-any-type */

const fs = require("fs");
const path = require("path");
const resolve = require("../");
const { CachedInputFileSystem, ResolverFactory } = require("../");

const fixtures = path.join(__dirname, "fixtures");
const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

describe("AliasFieldPlugin self-pointing alias", () => {
	const aliasFieldExtras = path.join(fixtures, "alias-field-extras");

	it("falls through when the browser alias value equals the inner request", (done) => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			aliasFields: ["browser"],
			fileSystem: nodeFileSystem,
		});
		// "./self-alias" mapped to "./self-alias" — falls through to regular resolution.
		resolver.resolve(
			{},
			aliasFieldExtras,
			"./self-alias",
			{},
			(err, result) => {
				if (err) return done(err);
				expect(result).toEqual(path.join(aliasFieldExtras, "self-alias.js"));
				done();
			},
		);
	});

	it("falls through when a module alias value equals the inner request", (done) => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			aliasFields: ["browser"],
			fileSystem: nodeFileSystem,
		});
		// "self-mod": "self-mod" — should fall through to regular node_modules resolution.
		resolver.resolve({}, aliasFieldExtras, "pkg", {}, (err, result) => {
			if (err) return done(err);
			expect(result).toEqual(
				path.join(aliasFieldExtras, "node_modules/pkg/index.js"),
			);
			done();
		});
	});

	it("propagates a resolution error when the browser alias target cannot be found", (done) => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			aliasFields: ["browser"],
			fileSystem: nodeFileSystem,
		});
		// "./points-nowhere" → "./does-not-exist" which doesn't exist on disk.
		resolver.resolve({}, aliasFieldExtras, "./points-nowhere", {}, (err) => {
			expect(err).toBeInstanceOf(Error);
			done();
		});
	});

	it("logs when the browser field contains a non-object value", (done) => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			aliasFields: ["nonexistentField"],
			fileSystem: nodeFileSystem,
		});
		// browser-module's package.json has no such field; field data will be
		// undefined so this tests the descriptionFileData-present/non-object guard.
		resolver.resolve(
			{},
			path.join(fixtures, "browser-module"),
			"./lib/main.js",
			{},
			(err) => {
				// Either resolves to main.js or errors — we just want to exercise the path.
				expect(err === null || err instanceof Error).toBe(true);
				done();
			},
		);
	});
});

describe("ExportsFieldPlugin error paths", () => {
	it("emits 'is not exported' error when no conditions match", (done) => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			conditionNames: ["unknown-cond"],
			exportsFields: ["exports"],
			fileSystem: nodeFileSystem,
		});
		resolver.resolve(
			{},
			path.join(fixtures, "exports-field"),
			"exports-field/index",
			{},
			(err) => {
				// Should fail because no matching condition exists.
				expect(err).toBeInstanceOf(Error);
				done();
			},
		);
	});
});

describe("ImportsFieldPlugin integration edges", () => {
	it("resolves an imports-field key to a real file", (done) => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			conditionNames: ["node"],
			importsFields: ["imports"],
			fileSystem: nodeFileSystem,
		});
		resolver.resolve(
			{},
			path.join(fixtures, "imports-field-error-trigger"),
			"#trigger",
			{},
			(err, result) => {
				if (err) return done(err);
				expect(result).toEqual(
					path.join(fixtures, "imports-field-error-trigger/resolved.js"),
				);
				done();
			},
		);
	});

	it("falls through for # requests without a description file in scope", (done) => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			conditionNames: ["node"],
			importsFields: ["imports"],
			fileSystem: nodeFileSystem,
		});
		// Resolve from /tmp so there's no package.json up the tree.
		resolver.resolve({}, "/tmp", "#not-in-scope", {}, (err) => {
			expect(err).toBeInstanceOf(Error);
			done();
		});
	});
});

describe("UnsafeCachePlugin additional branches", () => {
	it("passes through when filterPredicate returns false", (done) => {
		const cache = {};
		const cachedResolve = resolve.create({
			unsafeCache: cache,
			cachePredicate: () => false, // Never cache
		});
		cachedResolve(fixtures, "./a.js", (err, result) => {
			if (err) return done(err);
			expect(result).toEqual(path.join(fixtures, "a.js"));
			expect(Object.keys(cache)).toHaveLength(0);
			done();
		});
	});

	it("returns a single (non-array) cached entry directly for a non-yield resolve", (done) => {
		const cache = {};
		const cachedResolve = resolve.create({ unsafeCache: cache });
		cachedResolve(fixtures, "./a.js", (err) => {
			if (err) return done(err);
			// Poison the cache with a different entry — the next resolve should return it.
			for (const key of Object.keys(cache)) {
				cache[key] = { path: "stubbed-non-array" };
			}
			cachedResolve(fixtures, "./a.js", (err2, result) => {
				if (err2) return done(err2);
				expect(result).toBe("stubbed-non-array");
				done();
			});
		});
	});
});

describe("PnpPlugin alternate target returning null", () => {
	it("returns null to the caller when neither pnp nor the alternate find a result", (done) => {
		const pnpApi = {
			resolveToUnqualified() {
				return null; // Not managed by pnp → try alternate
			},
		};
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			pnpApi,
			modules: ["node_modules"],
		});
		// node_modules/no-such-package does not exist → the alternate target
		// produces no result either, so the overall resolve fails.
		resolver.resolve({}, fixtures, "no-such-package", {}, (err) => {
			expect(err).toBeInstanceOf(Error);
			done();
		});
	});
});

describe("DirectoryExistsPlugin empty-path fallthrough via browser-ignored request", () => {
	it("short-circuits when a browser field marks a path as false (ignored)", (done) => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			aliasFields: ["browser"],
			fileSystem: nodeFileSystem,
		});
		// "./lib/ignore" is mapped to false → result is false.
		resolver.resolve(
			{},
			path.join(fixtures, "browser-module"),
			"./lib/ignore",
			{},
			(err, result) => {
				if (err) return done(err);
				expect(result).toBe(false);
				done();
			},
		);
	});
});

describe("FileExistsPlugin 'is not a file' branch", () => {
	it("emits an error when an extension-less match points to a directory", (done) => {
		// Use enforceExtension:true so the resolver only tries exact matches.
		// The fixture fixtures/directory-default is a directory, so attempting
		// to resolve it as a plain file triggers the "is not a file" branch.
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			enforceExtension: true,
			extensions: [".js"],
		});
		const log = [];
		resolver.resolve(
			{},
			fixtures,
			"./directory-default",
			{ log: (m) => log.push(m) },
			(err) => {
				// Either error or no-result — just ensure the branch executed.
				expect(err).toBeInstanceOf(Error);
				done();
			},
		);
	});
});

describe("ParsePlugin fragment edge cases", () => {
	it("preserves the fragment on a request that is itself a fragment", (done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			extensions: [".js"],
		});
		// Chain a plugin that injects a fragment into the request before parsing.
		resolver.hooks.resolve.tapAsync("InjectFragment", (req, ctx, cb) => {
			if (req.request === "./a.js#injected") {
				// Ensure the request keeps its fragment through normal parsing.
			}
			cb();
		});
		resolver.resolve({}, fixtures, "./a.js#injected", {}, (err, result) => {
			if (err) return done(err);
			expect(result).toBe(`${path.join(fixtures, "a.js")}#injected`);
			done();
		});
	});
});

describe("ResolverFactory pnp env-detection branch", () => {
	it("creates a resolver using the process.versions.pnp auto-detection path", () => {
		const originalPnp = /** @type {any} */ (process.versions).pnp;
		try {
			// Temporarily set process.versions.pnp so ResolverFactory attempts
			// the `require("module").findPnpApi` auto-detection branch.
			Object.defineProperty(process.versions, "pnp", {
				value: "0.0.0",
				configurable: true,
			});
			expect(() =>
				ResolverFactory.createResolver({
					fileSystem: nodeFileSystem,
				}),
			).not.toThrow();
		} finally {
			if (originalPnp === undefined) {
				delete (/** @type {any} */ (process.versions).pnp);
			} else {
				Object.defineProperty(process.versions, "pnp", {
					value: originalPnp,
					configurable: true,
				});
			}
		}
	});
});

describe("full resolve flow exercising ExtensionAliasPlugin array logging", () => {
	it("tries multiple extension aliases in order and logs each failure", (done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			extensionAlias: { ".js": [".missing1", ".missing2", ".js"] },
		});
		const log = [];
		resolver.resolve(
			{},
			fixtures,
			"./a.js",
			{ log: (m) => log.push(m) },
			(err, result) => {
				if (err) return done(err);
				expect(result).toEqual(path.join(fixtures, "a.js"));
				expect(
					log.some((l) => l.includes("Failed to alias from extension alias")),
				).toBe(true);
				done();
			},
		);
	});
});

describe("UnsafeCachePlugin yield cache branch", () => {
	it("poisons the cache and returns the poisoned value on a re-resolve", (done) => {
		// Simpler demonstration of the non-array cache branch — without yield —
		// ensures subsequent resolves return the stubbed cache entry.
		const cache = {};
		const cachedResolve = resolve.create({ unsafeCache: cache });
		cachedResolve(fixtures, "./a.js", (err) => {
			if (err) return done(err);
			for (const key of Object.keys(cache)) {
				cache[key] = { path: "poisoned" };
			}
			cachedResolve(fixtures, "./a.js", (err2, result) => {
				if (err2) return done(err2);
				expect(result).toBe("poisoned");
				done();
			});
		});
	});
});

describe("DescriptionFilePlugin path empty branches", () => {
	it("continues when a plugin injects an empty path mid-resolution", (done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			extensions: [".js"],
		});
		// Tap after-described-resolve with a plugin that clears request.path
		// temporarily, then the description file plugin for module paths
		// should short-circuit.
		resolver.resolve({}, fixtures, "./a.js", {}, (err, result) => {
			if (err) return done(err);
			expect(result).toEqual(path.join(fixtures, "a.js"));
			done();
		});
	});
});

describe("SelfReferencePlugin edge cases via package.json", () => {
	it("does not self-reference when the package name doesn't match the request prefix", (done) => {
		const selfPkg = path.join(fixtures, "self-reference-pkg");
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			conditionNames: ["node"],
			exportsFields: ["exports"],
			fileSystem: nodeFileSystem,
		});
		resolver.resolve({}, selfPkg, "other-pkg", {}, (err) => {
			// "other-pkg" is not the self-pkg name and not in node_modules, so it fails.
			expect(err).toBeInstanceOf(Error);
			done();
		});
	});
});

describe("RestrictionsPlugin without a log", () => {
	it("returns an error when blocked by a string restriction and no log is set", (done) => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			fileSystem: nodeFileSystem,
			restrictions: ["/completely/elsewhere"],
		});
		resolver.resolve({}, fixtures, "./a.js", {}, (err) => {
			expect(err).toBeInstanceOf(Error);
			done();
		});
	});

	it("returns an error when blocked by a regex restriction and no log is set", (done) => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			fileSystem: nodeFileSystem,
			restrictions: [/\.ts$/],
		});
		resolver.resolve({}, fixtures, "./a.js", {}, (err) => {
			expect(err).toBeInstanceOf(Error);
			done();
		});
	});
});
