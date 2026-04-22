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

	it("should resolve a not aliased module", async () => {
		expect(await resolver.resolvePromise({}, "/", "a")).toBe("/a/index");
		expect(await resolver.resolvePromise({}, "/", "a/index")).toBe("/a/index");
		expect(await resolver.resolvePromise({}, "/", "a/dir")).toBe(
			"/a/dir/index",
		);
		expect(await resolver.resolvePromise({}, "/", "a/dir/index")).toBe(
			"/a/dir/index",
		);
	});

	it("should resolve an aliased module", async () => {
		expect(await resolver.resolvePromise({}, "/", "aliasA")).toBe("/a/index");
		expect(await resolver.resolvePromise({}, "/", "aliasA/index")).toBe(
			"/a/index",
		);
		expect(await resolver.resolvePromise({}, "/", "aliasA/dir")).toBe(
			"/a/dir/index",
		);
		expect(await resolver.resolvePromise({}, "/", "aliasA/dir/index")).toBe(
			"/a/dir/index",
		);
	});

	it('should resolve "#" alias', async () => {
		expect(await resolver.resolvePromise({}, "/", "#")).toBe("/c/dir/index");
		expect(await resolver.resolvePromise({}, "/", "#/index")).toBe(
			"/c/dir/index",
		);
	});

	it('should resolve "@" alias', async () => {
		expect(await resolver.resolvePromise({}, "/", "@")).toBe("/c/dir/index");
		expect(await resolver.resolvePromise({}, "/", "@/index")).toBe(
			"/c/dir/index",
		);
	});

	it("should resolve wildcard alias", async () => {
		expect(await resolver.resolvePromise({}, "/", "@a")).toBe("/a/index");
		expect(await resolver.resolvePromise({}, "/", "@a/dir")).toBe(
			"/a/dir/index",
		);
		expect(await resolver.resolvePromise({}, "/", "@e/dir/file")).toBe(
			"/e/dir/file",
		);
		expect(await resolver.resolvePromise({}, "/", "@e/anotherDir")).toBe(
			"/e/anotherDir/index",
		);
		expect(await resolver.resolvePromise({}, "/", "@e/dir/file")).toBe(
			"/e/dir/file",
		);
	});

	it("should resolve an ignore module", async () => {
		expect(await resolver.resolvePromise({}, "/", "ignored")).toBe(false);
	});

	it("should resolve a recursive aliased module", async () => {
		expect(await resolver.resolvePromise({}, "/", "recursive")).toBe(
			"/recursive/dir/index",
		);
		expect(await resolver.resolvePromise({}, "/", "recursive/index")).toBe(
			"/recursive/dir/index",
		);
		expect(await resolver.resolvePromise({}, "/", "recursive/dir")).toBe(
			"/recursive/dir/index",
		);
		expect(await resolver.resolvePromise({}, "/", "recursive/dir/index")).toBe(
			"/recursive/dir/index",
		);
	});

	it("should resolve a file aliased module", async () => {
		expect(await resolver.resolvePromise({}, "/", "b")).toBe("/a/index");
		expect(await resolver.resolvePromise({}, "/", "c")).toBe("/a/index");
	});

	it("should resolve a file aliased module with a query", async () => {
		expect(await resolver.resolvePromise({}, "/", "b?query")).toBe(
			"/a/index?query",
		);
		expect(await resolver.resolvePromise({}, "/", "c?query")).toBe(
			"/a/index?query",
		);
	});

	it("should resolve a path in a file aliased module", async () => {
		expect(await resolver.resolvePromise({}, "/", "b/index")).toBe("/b/index");
		expect(await resolver.resolvePromise({}, "/", "b/dir")).toBe(
			"/b/dir/index",
		);
		expect(await resolver.resolvePromise({}, "/", "b/dir/index")).toBe(
			"/b/dir/index",
		);
		expect(await resolver.resolvePromise({}, "/", "c/index")).toBe("/c/index");
		expect(await resolver.resolvePromise({}, "/", "c/dir")).toBe(
			"/c/dir/index",
		);
		expect(await resolver.resolvePromise({}, "/", "c/dir/index")).toBe(
			"/c/dir/index",
		);
	});

	it("should resolve a file aliased file", async () => {
		expect(await resolver.resolvePromise({}, "/", "d")).toBe("/c/index");
		expect(await resolver.resolvePromise({}, "/", "d/dir/index")).toBe(
			"/c/dir/index",
		);
	});

	it("should resolve a file in multiple aliased dirs", async () => {
		expect(await resolver.resolvePromise({}, "/", "multiAlias/dir/file")).toBe(
			"/e/dir/file",
		);
		expect(
			await resolver.resolvePromise({}, "/", "multiAlias/anotherDir"),
		).toBe("/e/anotherDir/index");
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

	it("should resolve a wildcard alias with multiple targets correctly", async () => {
		expect(await resolver.resolvePromise({}, "/", "shared/b")).toBe(
			"/src/components/b",
		);
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

		it("falls back to the next target once the preferred file is removed", async () => {
			const { resolver, fileSystem } = createThemeResolver({
				"/fancy-theme/Hello.js": "",
				"/default-theme/Hello.js": "",
			});

			expect(await resolver.resolvePromise({}, "/", "theme/Hello")).toBe(
				"/fancy-theme/Hello.js",
			);

			fileSystem.unlinkSync("/fancy-theme/Hello.js");

			expect(await resolver.resolvePromise({}, "/", "theme/Hello")).toBe(
				"/default-theme/Hello.js",
			);
		});

		it("picks up a newly created higher-priority file", async () => {
			const { resolver, fileSystem } = createThemeResolver({
				"/default-theme/Hello.js": "",
			});

			expect(await resolver.resolvePromise({}, "/", "theme/Hello")).toBe(
				"/default-theme/Hello.js",
			);

			fileSystem.mkdirSync("/fancy-theme");
			fileSystem.writeFileSync("/fancy-theme/Hello.js", "");

			expect(await resolver.resolvePromise({}, "/", "theme/Hello")).toBe(
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
