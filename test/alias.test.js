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
				expect(log).toEqual([
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

		it("aliases a raw absolute subpath request (raw-resolve hook)", (done) => {
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
					expect(result).toBe(expectedIndex);
					done();
				},
			);
		});

		it("aliases a request that equals the alias name (exact equality)", (done) => {
			absResolver.resolve({}, fixturesDir, aliasName, {}, (err, result) => {
				if (err) return done(err);
				expect(result).toBe(expectedIndex);
				done();
			});
		});

		it("aliases after JoinRequestPlugin normalizes the path (file hook)", (done) => {
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
					expect(result).toBe(expectedIndex);
					done();
				},
			);
		});

		it("does not fire for a different absolute prefix sharing the same head", (done) => {
			// `imaginary-food` shares `imaginary-foo` as a prefix but
			// not `imaginary-foo<sep>`. The alias must not fire, and
			// since `imaginary-food` does not exist, the resolve fails.
			const requestPath = path.join(fixturesDir, "imaginary-food", "index");
			absResolver.resolve({}, fixturesDir, requestPath, {}, (err, result) => {
				expect(err).toBeInstanceOf(Error);
				expect(result).toBeFalsy();
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
