"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const resolve = require("../");
const { findPackageIds, parsePackageMap } = require("../lib/util/packageMap");
const { describe, it } = require("./_runner");

const fixture = path.resolve(__dirname, "fixtures", "package-map");
const configFile = path.resolve(fixture, "package-map.json");

const appDir = path.resolve(fixture, "packages", "app");
const libDir = path.resolve(fixture, "lib");
const outsideDir = path.resolve(fixture, "outside");

/**
 * @param {object=} options extra resolver options
 * @returns {import("../types").ResolveFunction} a sync resolver using the fixture package map
 */
const createResolver = (options) =>
	resolve.create.sync({ packageMap: configFile, ...options });

/**
 * @param {() => void} fn function that should throw
 * @returns {Error & { code?: string }} the thrown error
 */
const catchError = (fn) => {
	try {
		fn();
	} catch (err) {
		return /** @type {Error & { code?: string }} */ (err);
	}
	throw new Error("Expected the call to throw");
};

describe("package map", () => {
	describe("resolution", () => {
		it("should resolve a bare specifier through the importing package's dependencies", () => {
			const resolver = createResolver();

			assert.strictEqual(
				resolver(appDir, "@acme/utils"),
				path.resolve(fixture, "packages/utils/index.js"),
			);
		});

		it("should forward the remaining request to the regular pipeline", () => {
			const resolver = createResolver();

			assert.strictEqual(
				resolver(appDir, "@acme/utils/sub"),
				path.resolve(fixture, "packages/utils/sub.js"),
			);
		});

		it("should pick the version the importing package depends on", () => {
			const resolver = createResolver();

			assert.strictEqual(
				resolver(appDir, "component"),
				path.resolve(fixture, "vendor/component-v2/index.js"),
			);
		});

		it("should not fall back to node_modules for an undeclared specifier", () => {
			const resolver = createResolver();
			const err = catchError(() => resolver(appDir, "m1"));

			assert.match(err.message, /Can't resolve 'm1'/);
		});

		it("should leave relative requests alone", () => {
			const resolver = createResolver();

			assert.strictEqual(
				resolver(appDir, "./index.js"),
				path.resolve(fixture, "packages/app/index.js"),
			);
		});

		it("should accept an already-parsed packages object", () => {
			const resolver = resolve.create.sync({
				packageMap: {
					configFile,
					packages: {
						app: {
							url: "./packages/app",
							dependencies: { "@acme/utils": "utils" },
						},
						utils: { url: "./packages/utils" },
					},
				},
			});

			assert.strictEqual(
				resolver(appDir, "@acme/utils"),
				path.resolve(fixture, "packages/utils/index.js"),
			);
		});
	});

	describe("precedence", () => {
		it("should not let a self-reference bypass the dependency table", () => {
			// `packages/utils` has a `name` and an `exports` map, so without the
			// package map it could import itself. The map does not declare that
			// dependency, so it must not resolve.
			const resolver = createResolver();
			const utilsDir = path.resolve(fixture, "packages", "utils");
			const err = catchError(() => resolver(utilsDir, "@acme/utils/sub"));

			assert.match(err.message, /Can't resolve '@acme\/utils\/sub'/);
		});

		it("should resolve a self-reference the map declares", () => {
			const resolver = resolve.create.sync({
				packageMap: {
					configFile,
					packages: {
						utils: {
							url: "./packages/utils",
							dependencies: { "@acme/utils": "utils" },
						},
					},
				},
			});
			const utilsDir = path.resolve(fixture, "packages", "utils");

			assert.strictEqual(
				resolver(utilsDir, "@acme/utils/sub"),
				path.resolve(fixture, "packages/utils/sub.js"),
			);
		});
	});

	describe("package identity", () => {
		it("should report an importer outside every mapped package", () => {
			const resolver = createResolver();
			const err = catchError(() => resolver(outsideDir, "component"));

			assert.strictEqual(err.code, "ERR_PACKAGE_MAP_EXTERNAL_FILE");
		});

		it("should refuse to guess when packages share a location", () => {
			const resolver = createResolver();
			const err = catchError(() => resolver(libDir, "component"));

			assert.strictEqual(err.code, "ERR_PACKAGE_MAP_AMBIGUOUS_PACKAGE");
			assert.match(err.message, /"lib-old", "lib-new"/);
		});

		it("should use an explicit package id to disambiguate", () => {
			const resolver = createResolver();

			assert.strictEqual(
				resolver({ packageId: "lib-old" }, libDir, "component"),
				path.resolve(fixture, "vendor/component-v1/index.js"),
			);
			assert.strictEqual(
				resolver({ packageId: "lib-new" }, libDir, "component"),
				path.resolve(fixture, "vendor/component-v2/index.js"),
			);
		});

		it("should accept the empty string as a package id", () => {
			const resolver = resolve.create.sync({
				packageMap: {
					configFile,
					packages: {
						"": {
							url: "./lib",
							dependencies: { component: "component-v1" },
						},
						"lib-other": { url: "./lib" },
						"component-v1": { url: "./vendor/component-v1" },
					},
				},
			});
			const libDir = path.resolve(fixture, "lib");

			// Two ids share `./lib`, so the empty id has to survive being
			// propagated or this would report ambiguity instead.
			assert.strictEqual(
				resolver({ packageId: "" }, libDir, "component"),
				path.resolve(fixture, "vendor/component-v1/index.js"),
			);
		});

		it("should reject an unknown package id", () => {
			const resolver = createResolver();
			const err = catchError(() =>
				resolver({ packageId: "nope" }, libDir, "component"),
			);

			assert.strictEqual(err.code, "ERR_PACKAGE_MAP_UNKNOWN_PACKAGE");
		});

		it("should expose the resolved package id on the result", (t, done) => {
			const resolver = resolve.create({ packageMap: configFile });

			resolver({}, appDir, "component", {}, (err, result, request) => {
				if (err) return done(err);
				assert.strictEqual(
					result,
					path.resolve(fixture, "vendor/component-v2/index.js"),
				);
				assert.strictEqual(
					/** @type {import("../lib/Resolver").ResolveRequest} */ (request)
						.packageId,
					"component-v2",
				);
				done();
			});
		});
	});

	describe("configuration", () => {
		it("should require a config file next to inline packages", () => {
			const err = catchError(() =>
				resolve.create.sync({
					packageMap: { packages: { app: { url: "./packages/app" } } },
				}),
			);

			assert.match(err.message, /needs a 'configFile'/);
		});

		it("should report an unknown dependency target", () => {
			const err = catchError(() =>
				parsePackageMap(
					{ packages: { app: { url: "./app", dependencies: { x: "gone" } } } },
					configFile,
				),
			);

			assert.strictEqual(err.code, "ERR_INVALID_PACKAGE_MAP");
			assert.match(err.message, /unknown package id "gone"/);
		});

		it("should reject an empty url", () => {
			const err = catchError(() =>
				parsePackageMap({ packages: { app: { url: "" } } }, configFile),
			);

			assert.strictEqual(err.code, "ERR_INVALID_PACKAGE_MAP");
			assert.match(err.message, /non-empty string "url"/);
		});

		it("should resolve a relative config file against the working directory", () => {
			const cwd = process.cwd();
			const relative = `.${path.sep}${path.relative(cwd, configFile)}`;
			const resolver = resolve.create.sync({ packageMap: relative });

			assert.strictEqual(
				resolver(appDir, "@acme/utils"),
				path.resolve(fixture, "packages/utils/index.js"),
			);
		});

		it("should reject a non-file url", () => {
			const err = catchError(() =>
				parsePackageMap(
					{ packages: { app: { url: "https://example.com/app" } } },
					configFile,
				),
			);

			assert.strictEqual(err.code, "ERR_INVALID_PACKAGE_MAP");
			assert.match(err.message, /must use a "file:" url/);
		});

		it("should reject a missing packages object", () => {
			const err = catchError(() => parsePackageMap({}, configFile));

			assert.strictEqual(err.code, "ERR_INVALID_PACKAGE_MAP");
		});

		it("should report a missing config file", () => {
			const resolver = resolve.create.sync({
				packageMap: path.resolve(fixture, "does-not-exist.json"),
			});
			const err = catchError(() => resolver(appDir, "component"));

			assert.strictEqual(err.code, "ENOENT");
		});
	});

	describe("invalid configuration", () => {
		/** @type {[string, unknown, RegExp][]} */
		const invalid = [
			["non-object contents", "not an object", /must contain a JSON object/],
			["an array", [], /must contain a JSON object/],
			["a missing packages object", {}, /must contain a "packages" object/],
			[
				"a non-object packages",
				{ packages: [] },
				/must contain a "packages" object/,
			],
			[
				"a non-object entry",
				{ packages: { app: "./app" } },
				/entry "app" must be an object/,
			],
			[
				"an entry without a url",
				{ packages: { app: {} } },
				/entry "app" must have a non-empty string "url"/,
			],
			[
				"a non-object dependencies",
				{ packages: { app: { url: "./app", dependencies: [] } } },
				/entry "app" has a non-object "dependencies"/,
			],
			[
				"a non-string dependency target",
				{ packages: { app: { url: "./app", dependencies: { x: 1 } } } },
				/maps "x" to a non-string package id/,
			],
		];

		for (const [name, data, expected] of invalid) {
			it(`should reject ${name}`, () => {
				const err = catchError(() =>
					parsePackageMap(
						/** @type {import("../lib/Resolver").JsonObject} */ (data),
						configFile,
					),
				);

				assert.strictEqual(err.code, "ERR_INVALID_PACKAGE_MAP");
				assert.match(err.message, expected);
			});
		}

		it("should reject a url the URL parser cannot read", () => {
			const err = catchError(() =>
				parsePackageMap({ packages: { app: { url: "http://[" } } }, configFile),
			);

			assert.strictEqual(err.code, "ERR_INVALID_PACKAGE_MAP");
			assert.match(err.message, /invalid "url"/);
		});

		it("should reject an inline packages object that is invalid", () => {
			const resolver = resolve.create.sync({
				packageMap: { configFile, packages: { app: { url: "https://x/a" } } },
			});
			const err = catchError(() => resolver(appDir, "component"));

			assert.strictEqual(err.code, "ERR_INVALID_PACKAGE_MAP");
		});

		it("should reject a config file that is valid JSON but not a package map", () => {
			const resolver = resolve.create.sync({
				packageMap: path.resolve(fixture, "invalid-map.json"),
			});
			const err = catchError(() => resolver(appDir, "component"));

			assert.strictEqual(err.code, "ERR_INVALID_PACKAGE_MAP");
			assert.match(err.message, /must use a "file:" url/);
		});

		it("should reject a config file that is not valid JSON", () => {
			const resolver = resolve.create.sync({
				packageMap: path.resolve(fixture, "packages", "app", "index.js"),
			});

			assert.throws(() => resolver(appDir, "component"));
		});

		it("should require a config file or packages", () => {
			const err = catchError(() => resolve.create.sync({ packageMap: {} }));

			assert.match(err.message, /needs either a 'configFile' or 'packages'/);
		});
	});

	describe("resolve context", () => {
		it("should record the config file as a dependency", (t, done) => {
			const resolver = resolve.create({ packageMap: configFile });
			const fileDependencies = new Set();

			resolver({}, appDir, "component", { fileDependencies }, (err, result) => {
				if (err) return done(err);
				assert.ok(result);
				assert.ok(fileDependencies.has(configFile));
				done();
			});
		});

		it("should log an undeclared specifier", (t, done) => {
			const resolver = resolve.create({ packageMap: configFile });
			/** @type {string[]} */
			const log = [];

			resolver({}, appDir, "m1", { log: (line) => log.push(line) }, (err) => {
				assert.ok(err);
				assert.ok(
					log.some((line) =>
						line.includes('"m1" is not a dependency of package "app"'),
					),
					`expected a log line about "m1", got:\n${log.join("\n")}`,
				);
				done();
			});
		});

		it("should read the config file once for concurrent resolutions", (t, done) => {
			let reads = 0;
			const fileSystem = {
				...fs,
				readFile(/** @type {string} */ file, /** @type {unknown[]} */ ...args) {
					if (file === configFile) reads++;
					// @ts-expect-error forwarding the original overloads
					return fs.readFile(file, ...args);
				},
			};
			const resolver = resolve.create({
				packageMap: configFile,
				fileSystem:
					/** @type {import("../lib/Resolver").FileSystem} */
					(/** @type {unknown} */ (fileSystem)),
			});

			let pending = 3;
			/**
			 * @param {(null | Error)=} err resolve error
			 * @returns {void}
			 */
			const next = (err) => {
				if (err) return done(err);
				if (--pending === 0) {
					// The first request starts the read; the other two queue behind
					// it rather than each reading the file again.
					assert.strictEqual(reads, 1);
					done();
				}
			};

			for (let i = 0; i < 3; i++) {
				resolver({}, appDir, "component", {}, next);
			}
		});

		it("should not treat a node: specifier as a package", (t, done) => {
			const resolver = resolve.create({ packageMap: configFile });

			resolver({}, appDir, "node:fs", {}, (err) => {
				// The package map leaves builtins alone, so this falls through to
				// the regular module lookup and simply is not found on disk.
				assert.ok(err);
				assert.doesNotMatch(String(err.message), /package map/);
				done();
			});
		});

		it("should fail when the mapped package has nothing to resolve", () => {
			const resolver = resolve.create.sync({
				packageMap: {
					configFile,
					packages: {
						app: {
							url: "./packages/app",
							dependencies: { missing: "missing" },
						},
						missing: { url: "./does-not-exist" },
					},
				},
			});
			const err = catchError(() => resolver(appDir, "missing"));

			assert.match(err.message, /Can't resolve 'missing'/);
		});
	});

	describe("lookup tables", () => {
		it("should return every package id sharing a location", () => {
			const packageMap = parsePackageMap(
				{
					packages: {
						"lib-old": { url: "./lib" },
						"lib-new": { url: "./lib" },
					},
				},
				configFile,
			);

			assert.deepStrictEqual(
				findPackageIds(packageMap, path.resolve(fixture, "lib/index.js")),
				["lib-old", "lib-new"],
			);
		});

		it("should prefer the most deeply nested package", () => {
			const packageMap = parsePackageMap(
				{
					packages: {
						outer: { url: "./packages" },
						inner: { url: "./packages/app" },
					},
				},
				configFile,
			);

			assert.deepStrictEqual(
				findPackageIds(packageMap, path.resolve(fixture, "packages/app/x.js")),
				["inner"],
			);
			assert.deepStrictEqual(
				findPackageIds(packageMap, path.resolve(fixture, "packages/other.js")),
				["outer"],
			);
		});

		it("should not treat a sibling with a shared prefix as inside", () => {
			const packageMap = parsePackageMap(
				{ packages: { app: { url: "./packages/app" } } },
				configFile,
			);

			assert.deepStrictEqual(
				findPackageIds(
					packageMap,
					path.resolve(fixture, "packages/app-other/x.js"),
				),
				[],
			);
		});
	});
});
