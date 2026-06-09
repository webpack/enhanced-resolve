"use strict";

const assert = require("assert");
const fs = require("fs");

const path = require("path");
const { Volume } = require("memfs");
const { ResolverFactory } = require("../");
const CachedInputFileSystem = require("../lib/CachedInputFileSystem");
const { beforeEach, describe, it } = require("./_runner");

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
		assert.strictEqual(resolver.resolveSync({}, "/", "a"), "/a/index");
		assert.strictEqual(resolver.resolveSync({}, "/", "a/index"), "/a/index");
		assert.strictEqual(resolver.resolveSync({}, "/", "a/dir"), "/a/dir/index");
		assert.strictEqual(
			resolver.resolveSync({}, "/", "a/dir/index"),
			"/a/dir/index",
		);
	});

	it("should resolve an aliased module", () => {
		assert.strictEqual(resolver.resolveSync({}, "/", "aliasA"), "/a/index");
		assert.strictEqual(
			resolver.resolveSync({}, "/", "aliasA/index"),
			"/a/index",
		);
		assert.strictEqual(
			resolver.resolveSync({}, "/", "aliasA/dir"),
			"/a/dir/index",
		);
		assert.strictEqual(
			resolver.resolveSync({}, "/", "aliasA/dir/index"),
			"/a/dir/index",
		);
	});

	it('should resolve "#" alias', () => {
		assert.strictEqual(resolver.resolveSync({}, "/", "#"), "/c/dir/index");
		assert.strictEqual(
			resolver.resolveSync({}, "/", "#/index"),
			"/c/dir/index",
		);
	});

	it('should resolve "@" alias', () => {
		assert.strictEqual(resolver.resolveSync({}, "/", "@"), "/c/dir/index");
		assert.strictEqual(
			resolver.resolveSync({}, "/", "@/index"),
			"/c/dir/index",
		);
	});

	it("should resolve wildcard alias", () => {
		assert.strictEqual(resolver.resolveSync({}, "/", "@a"), "/a/index");
		assert.strictEqual(resolver.resolveSync({}, "/", "@a/dir"), "/a/dir/index");
		assert.strictEqual(
			resolver.resolveSync({}, "/", "@e/dir/file"),
			"/e/dir/file",
		);
		assert.strictEqual(
			resolver.resolveSync({}, "/", "@e/anotherDir"),
			"/e/anotherDir/index",
		);
		assert.strictEqual(
			resolver.resolveSync({}, "/", "@e/dir/file"),
			"/e/dir/file",
		);
	});

	it("should resolve an ignore module", () => {
		assert.strictEqual(resolver.resolveSync({}, "/", "ignored"), false);
	});

	it("should resolve a recursive aliased module", () => {
		assert.strictEqual(
			resolver.resolveSync({}, "/", "recursive"),
			"/recursive/dir/index",
		);
		assert.strictEqual(
			resolver.resolveSync({}, "/", "recursive/index"),
			"/recursive/dir/index",
		);
		assert.strictEqual(
			resolver.resolveSync({}, "/", "recursive/dir"),
			"/recursive/dir/index",
		);
		assert.strictEqual(
			resolver.resolveSync({}, "/", "recursive/dir/index"),
			"/recursive/dir/index",
		);
	});

	it("should resolve a file aliased module", () => {
		assert.strictEqual(resolver.resolveSync({}, "/", "b"), "/a/index");
		assert.strictEqual(resolver.resolveSync({}, "/", "c"), "/a/index");
	});

	it("should resolve a file aliased module with a query", () => {
		assert.strictEqual(
			resolver.resolveSync({}, "/", "b?query"),
			"/a/index?query",
		);
		assert.strictEqual(
			resolver.resolveSync({}, "/", "c?query"),
			"/a/index?query",
		);
	});

	it("should resolve a path in a file aliased module", () => {
		assert.strictEqual(resolver.resolveSync({}, "/", "b/index"), "/b/index");
		assert.strictEqual(resolver.resolveSync({}, "/", "b/dir"), "/b/dir/index");
		assert.strictEqual(
			resolver.resolveSync({}, "/", "b/dir/index"),
			"/b/dir/index",
		);
		assert.strictEqual(resolver.resolveSync({}, "/", "c/index"), "/c/index");
		assert.strictEqual(resolver.resolveSync({}, "/", "c/dir"), "/c/dir/index");
		assert.strictEqual(
			resolver.resolveSync({}, "/", "c/dir/index"),
			"/c/dir/index",
		);
	});

	it("should resolve a file aliased file", () => {
		assert.strictEqual(resolver.resolveSync({}, "/", "d"), "/c/index");
		assert.strictEqual(
			resolver.resolveSync({}, "/", "d/dir/index"),
			"/c/dir/index",
		);
	});

	it("should resolve a file in multiple aliased dirs", () => {
		assert.strictEqual(
			resolver.resolveSync({}, "/", "multiAlias/dir/file"),
			"/e/dir/file",
		);
		assert.strictEqual(
			resolver.resolveSync({}, "/", "multiAlias/anotherDir"),
			"/e/anotherDir/index",
		);
	});

	it("should log the correct info", (t, done) => {
		const log = [];
		resolver.resolve(
			{},
			"/",
			"aliasA/dir",
			{ log: (v) => log.push(v) },
			(err, result) => {
				if (err) return done(err);

				assert.strictEqual(result, "/a/dir/index");
				assert.deepStrictEqual(log, [
					"resolve 'aliasA/dir' in '/'",
					"  Parsed request is a module",
					"  No description file found in / or above",
					"  aliased with mapping 'aliasA': 'a' to 'a/dir'",
					"    Parsed request is a module",
					"    No description file found in / or above",
					"    resolve as module",
					"      looking for modules in /",
					"        existing directory /a",
					"          No description file found in /a or above",
					"          No description file found in /a or above",
					"          no extension",
					"            /a/dir is not a file",
					"          .js",
					"            /a/dir.js doesn't exist",
					"          .json",
					"            /a/dir.json doesn't exist",
					"          .node",
					"            /a/dir.node doesn't exist",
					"          as directory",
					"            existing directory /a/dir",
					"              No description file found in /a/dir or above",
					"              using path: /a/dir/index",
					"                No description file found in /a/dir or above",
					"                no extension",
					"                  existing file: /a/dir/index",
					"                    reporting result /a/dir/index",
				]);

				done();
			},
		);
	});

	it("should work with absolute paths", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			alias: {
				[path.resolve(__dirname, "fixtures", "foo")]: false,
			},
			modules: path.resolve(__dirname, "fixtures"),
			fileSystem: nodeFileSystem,
		});

		resolver.resolve({}, __dirname, "foo/index", {}, (err, result) => {
			if (err) done(err);
			assert.strictEqual(result, false);
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
		assert.strictEqual(resolver.resolveSync({}, "/", "/d/dir"), "/c/dir/index");
		assert.strictEqual(
			resolver.resolveSync({}, "/", "/d/dir/index"),
			"/c/dir/index",
		);
		assert.strictEqual(
			resolver.resolveSync({}, "/", "d/dir/index"),
			"/c/dir/index",
		);
		assert.strictEqual(resolver.resolveSync({}, "/", "d"), "/c/index");
	});

	it("should resolve a wildcard alias with multiple targets correctly", () => {
		assert.strictEqual(
			resolver.resolveSync({}, "/", "shared/b"),
			"/src/components/b",
		);
	});

	// Absolute-path aliasing — OS-native (posix on Linux CI, backslash
	// on Windows CI).
	//
	// These cases drive the full `resolver.resolve` pipeline against the
	// real `test/fixtures/` tree with `CachedInputFileSystem` — no
	// filesystem or matcher mocking. Paths are built through the Node
	// `path` module, so on Linux the alias name uses forward slashes
	// and on Windows the same test code exercises native backslashes.
	// That covers the regression the previous commit fixed
	// (`nameWithSlash` hardcodes `/`, which silently skipped native
	// backslash windows subpaths at the `raw-resolve` hook).
	describe("absolute path aliasing (OS-native)", () => {
		const fixturesDir = path.resolve(__dirname, "fixtures");
		// `imaginary-foo` deliberately does NOT exist on disk so the
		// only way the resolver can succeed for requests under it is
		// through the alias.
		const aliasName = path.resolve(fixturesDir, "imaginary-foo");
		const aliasTarget = path.resolve(fixturesDir, "foo");
		const expectedIndex = path.resolve(aliasTarget, "index.js");

		const absResolver = ResolverFactory.createResolver({
			extensions: [".js"],
			alias: { [aliasName]: aliasTarget },
			fileSystem: nodeFileSystem,
		});

		it("aliases a raw absolute subpath request (raw-resolve hook)", (t, done) => {
			// path.join uses the OS-native separator, so on windows this
			// is `...\\imaginary-foo\\index` and exercises the backslash
			// fallback; on linux it is `.../imaginary-foo/index`.
			absResolver.resolve(
				{},
				fixturesDir,
				path.join(aliasName, "index"),
				{},
				(err, result) => {
					if (err) return done(err);
					assert.strictEqual(result, expectedIndex);
					done();
				},
			);
		});

		it("aliases a request that equals the alias name (exact equality)", (t, done) => {
			absResolver.resolve({}, fixturesDir, aliasName, {}, (err, result) => {
				if (err) return done(err);
				assert.strictEqual(result, expectedIndex);
				done();
			});
		});

		it("aliases after JoinRequestPlugin normalizes the path (file hook)", (t, done) => {
			// A relative request hits `JoinRequestPlugin` first, which
			// turns it into `request.path` with `request.request` set to
			// `undefined`. That hits the `absolutePath`-only branch of
			// the matcher.
			absResolver.resolve(
				{},
				fixturesDir,
				`./${path.basename(aliasName)}/index`,
				{},
				(err, result) => {
					if (err) return done(err);
					assert.strictEqual(result, expectedIndex);
					done();
				},
			);
		});

		it("does not fire for a different absolute prefix sharing the same head", (t, done) => {
			// `imaginary-food` shares `imaginary-foo` as a prefix but
			// not `imaginary-foo<sep>`. The alias must not fire, and
			// since `imaginary-food` does not exist, the resolve fails.
			const requestPath = path.join(fixturesDir, "imaginary-food", "index");
			absResolver.resolve({}, fixturesDir, requestPath, {}, (err, result) => {
				assert.ok(err instanceof Error);
				assert.ok(!result);
				done();
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

			assert.strictEqual(
				resolver.resolveSync({}, "/", "theme/Hello"),
				"/fancy-theme/Hello.js",
			);

			fileSystem.unlinkSync("/fancy-theme/Hello.js");

			assert.strictEqual(
				resolver.resolveSync({}, "/", "theme/Hello"),
				"/default-theme/Hello.js",
			);
		});

		it("picks up a newly created higher-priority file", () => {
			const { resolver, fileSystem } = createThemeResolver({
				"/default-theme/Hello.js": "",
			});

			assert.strictEqual(
				resolver.resolveSync({}, "/", "theme/Hello"),
				"/default-theme/Hello.js",
			);

			fileSystem.mkdirSync("/fancy-theme");
			fileSystem.writeFileSync("/fancy-theme/Hello.js", "");

			assert.strictEqual(
				resolver.resolveSync({}, "/", "theme/Hello"),
				"/fancy-theme/Hello.js",
			);
		});

		it("reports a missing-higher-priority path as a missing dependency so watchers can invalidate", (t, done) => {
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
					assert.strictEqual(result, "/default-theme/Hello.js");
					// The winning file is tracked so that deletions invalidate.
					assert.strictEqual(
						fileDependencies.has("/default-theme/Hello.js"),
						true,
					);
					// The non-existent higher-priority file is tracked so that
					// its creation triggers a re-resolve (see issue #250).
					assert.strictEqual(
						missingDependencies.has("/fancy-theme/Hello.js"),
						true,
					);
					done();
				},
			);
		});
	});
});
