"use strict";

const fs = require("fs");
const path = require("path");
const { Volume } = require("memfs");
const { ResolverFactory } = require("../");
const CachedInputFileSystem = require("../lib/CachedInputFileSystem");

const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

describe("alias", () => {
	let resolver;

	beforeEach(() => {
		const fileSystem = Volume.fromJSON(
			{
				"/a/index": "",
				"/a/dir/index": "",
				"/recursive/index": "",
				"/recursive/dir/index": "",
				"/b/index": "",
				"/b/dir/index": "",
				"/c/index": "",
				"/c/dir/index": "",
				"/d/index.js": "",
				"/d/dir/.empty": "",
				"/e/index": "",
				"/e/anotherDir/index": "",
				"/e/dir/file": "",
				"/src/utils/a": "",
				"/src/components/b": "",
			},
			"/",
		);
		resolver = ResolverFactory.createResolver({
			alias: {
				aliasA: "a",
				b$: "a/index",
				c$: "/a/index",
				multiAlias: ["b", "c", "d", "e", "a"],
				recursive: "recursive/dir",
				"/d/dir": "/c/dir",
				"/d/index.js": "/c/index",
				// alias configuration should work
				"#": "/c/dir",
				"@": "/c/dir",
				"@*": "/*",
				"@e*": "/e/*",
				"@e*file": "/e*file",
				"shared/*": ["/src/utils/*", "/src/components/*"],
				ignored: false,
			},
			modules: "/",
			useSyncFileSystemCalls: true,
			// @ts-expect-error for tests
			fileSystem,
		});
	});

	it("should resolve a not aliased module", () => {
		expect(resolver.resolveSync({}, "/", "a")).toBe("/a/index");
		expect(resolver.resolveSync({}, "/", "a/index")).toBe("/a/index");
		expect(resolver.resolveSync({}, "/", "a/dir")).toBe("/a/dir/index");
		expect(resolver.resolveSync({}, "/", "a/dir/index")).toBe("/a/dir/index");
	});

	it("should resolve an aliased module", () => {
		expect(resolver.resolveSync({}, "/", "aliasA")).toBe("/a/index");
		expect(resolver.resolveSync({}, "/", "aliasA/index")).toBe("/a/index");
		expect(resolver.resolveSync({}, "/", "aliasA/dir")).toBe("/a/dir/index");
		expect(resolver.resolveSync({}, "/", "aliasA/dir/index")).toBe(
			"/a/dir/index",
		);
	});

	it('should resolve "#" alias', () => {
		expect(resolver.resolveSync({}, "/", "#")).toBe("/c/dir/index");
		expect(resolver.resolveSync({}, "/", "#/index")).toBe("/c/dir/index");
	});

	it('should resolve "@" alias', () => {
		expect(resolver.resolveSync({}, "/", "@")).toBe("/c/dir/index");
		expect(resolver.resolveSync({}, "/", "@/index")).toBe("/c/dir/index");
	});

	it("should resolve wildcard alias", () => {
		expect(resolver.resolveSync({}, "/", "@a")).toBe("/a/index");
		expect(resolver.resolveSync({}, "/", "@a/dir")).toBe("/a/dir/index");
		expect(resolver.resolveSync({}, "/", "@e/dir/file")).toBe("/e/dir/file");
		expect(resolver.resolveSync({}, "/", "@e/anotherDir")).toBe(
			"/e/anotherDir/index",
		);
		expect(resolver.resolveSync({}, "/", "@e/dir/file")).toBe("/e/dir/file");
	});

	it("should resolve an ignore module", () => {
		expect(resolver.resolveSync({}, "/", "ignored")).toBe(false);
	});

	it("should resolve a recursive aliased module", () => {
		expect(resolver.resolveSync({}, "/", "recursive")).toBe(
			"/recursive/dir/index",
		);
		expect(resolver.resolveSync({}, "/", "recursive/index")).toBe(
			"/recursive/dir/index",
		);
		expect(resolver.resolveSync({}, "/", "recursive/dir")).toBe(
			"/recursive/dir/index",
		);
		expect(resolver.resolveSync({}, "/", "recursive/dir/index")).toBe(
			"/recursive/dir/index",
		);
	});

	it("should resolve a file aliased module", () => {
		expect(resolver.resolveSync({}, "/", "b")).toBe("/a/index");
		expect(resolver.resolveSync({}, "/", "c")).toBe("/a/index");
	});

	it("should resolve a file aliased module with a query", () => {
		expect(resolver.resolveSync({}, "/", "b?query")).toBe("/a/index?query");
		expect(resolver.resolveSync({}, "/", "c?query")).toBe("/a/index?query");
	});

	it("should resolve a path in a file aliased module", () => {
		expect(resolver.resolveSync({}, "/", "b/index")).toBe("/b/index");
		expect(resolver.resolveSync({}, "/", "b/dir")).toBe("/b/dir/index");
		expect(resolver.resolveSync({}, "/", "b/dir/index")).toBe("/b/dir/index");
		expect(resolver.resolveSync({}, "/", "c/index")).toBe("/c/index");
		expect(resolver.resolveSync({}, "/", "c/dir")).toBe("/c/dir/index");
		expect(resolver.resolveSync({}, "/", "c/dir/index")).toBe("/c/dir/index");
	});

	it("should resolve a file aliased file", () => {
		expect(resolver.resolveSync({}, "/", "d")).toBe("/c/index");
		expect(resolver.resolveSync({}, "/", "d/dir/index")).toBe("/c/dir/index");
	});

	it("should resolve a file in multiple aliased dirs", () => {
		expect(resolver.resolveSync({}, "/", "multiAlias/dir/file")).toBe(
			"/e/dir/file",
		);
		expect(resolver.resolveSync({}, "/", "multiAlias/anotherDir")).toBe(
			"/e/anotherDir/index",
		);
	});

	it("should log the correct info", (done) => {
		const log = [];
		resolver.resolve(
			{},
			"/",
			"aliasA/dir",
			{ log: (v) => log.push(v) },
			(err, result) => {
				if (err) return done(err);

				expect(result).toBe("/a/dir/index");
				expect(log).toMatchSnapshot();

				done();
			},
		);
	});

	it("should work with absolute paths", (done) => {
		const resolver = ResolverFactory.createResolver({
			alias: {
				[path.resolve(__dirname, "fixtures", "foo")]: false,
			},
			modules: path.resolve(__dirname, "fixtures"),
			fileSystem: nodeFileSystem,
		});

		resolver.resolve({}, __dirname, "foo/index", {}, (err, result) => {
			if (err) done(err);
			expect(result).toBe(false);
			done();
		});
	});

	// Regression guard for the `firstCharCode` screen added in
	// AliasUtils. Absolute-path aliases must keep matching both when the
	// request is a raw absolute-path string (`request.request`, hits the
	// `nameWithSlash` branch at the `raw-resolve` hook) and after
	// `JoinRequestPlugin` has turned it into a joined `request.path`
	// (hits the `absolutePath` branch at the `file` hook). If the
	// char-code screen ever diverges from the startsWith comparison
	// these resolves silently fall through to the original target.
	it("should not skip absolute path aliasing", () => {
		expect(resolver.resolveSync({}, "/", "/d/dir")).toBe("/c/dir/index");
		expect(resolver.resolveSync({}, "/", "/d/dir/index")).toBe("/c/dir/index");
		expect(resolver.resolveSync({}, "/", "d/dir/index")).toBe("/c/dir/index");
		expect(resolver.resolveSync({}, "/", "d")).toBe("/c/index");
	});

	it("should resolve a wildcard alias with multiple targets correctly", () => {
		expect(resolver.resolveSync({}, "/", "shared/b")).toBe("/src/components/b");
	});

	// Absolute-path aliasing — posix + windows shapes.
	//
	// `memfs` (used by the full-resolver tests above) is posix-only, so
	// these cases drive a real `Resolver` wired with `AliasPlugin` and
	// a capture tap that stops the resolve immediately after aliasing.
	// No filesystem I/O happens, so both path dialects can be exercised
	// on the same machine.
	describe("absolute path aliasing (posix + windows shapes)", () => {
		const Resolver = require("../lib/Resolver");
		const AliasPlugin = require("../lib/AliasPlugin");

		/**
		 * @typedef {object} ForwardedRequest
		 * @property {string=} request aliased request string
		 * @property {string | false=} path carried-through path
		 */

		/**
		 * Builds a minimal `Resolver` with only the `AliasPlugin` under
		 * test tapped on a `source` hook. A capture tap on the `target`
		 * hook records the request produced by the alias transform and
		 * short-circuits the resolve, so the filesystem is never
		 * consulted.
		 * @param {{ name: string, alias: string }[]} options alias options
		 * @returns {(request: { request?: string, path?: string }) => ForwardedRequest | null} runner for a single request
		 */
		const createAliasRunner = (options) => {
			// Minimal filesystem stub — never touched because the capture
			// tap ends the resolve before any real file lookup.
			const resolver = new Resolver(
				/** @type {import("../lib/Resolver").FileSystem} */ (
					/** @type {unknown} */ ({})
				),
				/** @type {import("../lib/Resolver").ResolveOptions} */ (
					/** @type {unknown} */ ({})
				),
			);
			const source = resolver.ensureHook("source");
			const target = resolver.ensureHook("target");
			new AliasPlugin(source, options, target).apply(resolver);

			/** @type {ForwardedRequest | null} */
			let forwarded = null;
			target.tapAsync("Capture", (request, _resolveContext, cb) => {
				forwarded = /** @type {ForwardedRequest} */ (request);
				cb(null, request);
			});

			return (request) => {
				forwarded = null;
				resolver.doResolve(
					source,
					/** @type {import("../lib/Resolver").ResolveRequest} */ (
						/** @type {unknown} */ (request)
					),
					null,
					{ stack: new Set() },
					() => {},
				);
				return forwarded;
			};
		};

		describe("posix (Linux)", () => {
			const run = createAliasRunner([{ name: "/abs/foo", alias: "/new/bar" }]);

			it("matches a raw absolute subpath request (raw-resolve hook)", () => {
				const f = run({ request: "/abs/foo/baz", path: "/issuer" });
				expect(f).not.toBeNull();
				expect(/** @type {ForwardedRequest} */ (f).request).toBe(
					"/new/bar/baz",
				);
			});

			it("matches a joined absolute path (file hook, request.request undefined)", () => {
				const f = run({ request: undefined, path: "/abs/foo/baz" });
				expect(f).not.toBeNull();
				expect(/** @type {ForwardedRequest} */ (f).request).toBe(
					"/new/bar/baz",
				);
			});

			it("matches by exact equality when innerRequest === name", () => {
				const f = run({ request: "/abs/foo", path: "/issuer" });
				expect(f).not.toBeNull();
				expect(/** @type {ForwardedRequest} */ (f).request).toBe("/new/bar");
			});

			it("does not match a different posix prefix", () => {
				// "/abs/food/baz" shares `/abs/foo` as a prefix but not
				// `/abs/foo/`, so the alias must not fire.
				const f = run({ request: "/abs/food/baz", path: "/issuer" });
				expect(f).toBeNull();
			});
		});

		describe("windows (native backslash alias)", () => {
			const run = createAliasRunner([
				{ name: "C:\\abs\\foo", alias: "D:\\new\\bar" },
			]);

			it("matches a joined absolute path with native backslashes (file hook)", () => {
				const f = run({ request: undefined, path: "C:\\abs\\foo\\baz" });
				expect(f).not.toBeNull();
				expect(/** @type {ForwardedRequest} */ (f).request).toBe(
					"D:\\new\\bar\\baz",
				);
			});

			it("matches by exact equality for a raw windows absolute request", () => {
				const f = run({ request: "C:\\abs\\foo", path: "C:\\issuer" });
				expect(f).not.toBeNull();
				expect(/** @type {ForwardedRequest} */ (f).request).toBe(
					"D:\\new\\bar",
				);
			});

			it("matches a raw absolute subpath request with native backslashes (raw-resolve hook)", () => {
				// Regression: before the fix, `nameWithSlash` appended
				// a forward slash (`C:\\abs\\foo/`), so a raw request that
				// used the native backslash (`C:\\abs\\foo\\baz`) failed
				// `startsWith` and the alias was silently skipped.
				const f = run({ request: "C:\\abs\\foo\\baz", path: "C:\\issuer" });
				expect(f).not.toBeNull();
				expect(/** @type {ForwardedRequest} */ (f).request).toBe(
					"D:\\new\\bar\\baz",
				);
			});

			it("does not match a different windows prefix", () => {
				const f = run({ request: undefined, path: "C:\\abs\\food\\baz" });
				expect(f).toBeNull();
			});

			it("does not match a different drive letter", () => {
				const f = run({ request: undefined, path: "E:\\abs\\foo\\baz" });
				expect(f).toBeNull();
			});
		});

		describe("windows (forward-slash alias)", () => {
			const run = createAliasRunner([
				{ name: "C:/abs/foo", alias: "D:/new/bar" },
			]);

			it("matches a raw absolute subpath request with forward slashes", () => {
				const f = run({ request: "C:/abs/foo/baz", path: "C:/issuer" });
				expect(f).not.toBeNull();
				expect(/** @type {ForwardedRequest} */ (f).request).toBe(
					"D:/new/bar/baz",
				);
			});
		});
	});

	// Regression tests for the watch-mode fallback described in
	// https://github.com/webpack/enhanced-resolve/issues/395 and
	// https://github.com/webpack/enhanced-resolve/issues/250.
	//
	// When an alias maps to an array of target paths (used for
	// theme-override-style setups), a subsequent resolve after one of the
	// target files is deleted must gracefully fall back to the next target
	// in the array instead of holding on to the previously-resolved path.
	// Conversely, a newly created higher-priority file must be used on the
	// next resolve.
	describe("multi-target alias (theme override) watch-mode behavior", () => {
		const AliasPlugin = require("../lib/AliasPlugin");

		/**
		 * Builds a fresh resolver over an in-memory filesystem with a
		 * `theme` alias that maps to two directories in priority order.
		 * @param {Record<string, string>} files initial file contents keyed by absolute path
		 * @returns {{ resolver: import("../").Resolver, fileSystem: import("memfs").Volume }} helpers
		 */
		const createThemeResolver = (files) => {
			const fileSystem = Volume.fromJSON(files, "/");
			const resolver = ResolverFactory.createResolver({
				extensions: [".js"],
				useSyncFileSystemCalls: true,
				// @ts-expect-error for tests
				fileSystem,
				plugins: [
					new AliasPlugin(
						"described-resolve",
						[{ name: "theme", alias: ["/fancy-theme", "/default-theme"] }],
						"resolve",
					),
				],
			});

			return { resolver, fileSystem };
		};

		it("falls back to the next target once the preferred file is removed", () => {
			const { resolver, fileSystem } = createThemeResolver({
				"/fancy-theme/Hello.js": "",
				"/default-theme/Hello.js": "",
			});

			expect(resolver.resolveSync({}, "/", "theme/Hello")).toBe(
				"/fancy-theme/Hello.js",
			);

			fileSystem.unlinkSync("/fancy-theme/Hello.js");

			expect(resolver.resolveSync({}, "/", "theme/Hello")).toBe(
				"/default-theme/Hello.js",
			);
		});

		it("picks up a newly created higher-priority file", () => {
			const { resolver, fileSystem } = createThemeResolver({
				"/default-theme/Hello.js": "",
			});

			expect(resolver.resolveSync({}, "/", "theme/Hello")).toBe(
				"/default-theme/Hello.js",
			);

			fileSystem.mkdirSync("/fancy-theme");
			fileSystem.writeFileSync("/fancy-theme/Hello.js", "");

			expect(resolver.resolveSync({}, "/", "theme/Hello")).toBe(
				"/fancy-theme/Hello.js",
			);
		});

		it("reports a missing-higher-priority path as a missing dependency so watchers can invalidate", (done) => {
			const { resolver } = createThemeResolver({
				"/default-theme/Hello.js": "",
			});

			const fileDependencies = new Set();
			const missingDependencies = new Set();

			resolver.resolve(
				{},
				"/",
				"theme/Hello",
				{ fileDependencies, missingDependencies },
				(err, result) => {
					if (err) return done(err);
					expect(result).toBe("/default-theme/Hello.js");
					// The winning file is tracked so that deletions invalidate.
					expect(fileDependencies.has("/default-theme/Hello.js")).toBe(true);
					// The non-existent higher-priority file is tracked so that
					// its creation triggers a re-resolve (see issue #250).
					expect(missingDependencies.has("/fancy-theme/Hello.js")).toBe(true);
					done();
				},
			);
		});
	});
});
