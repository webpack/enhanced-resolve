"use strict";

const assert = require("assert");
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

		it("should accept a `file:` URL as the config file", () => {
			const resolver = resolve.create.sync({
				packageMap: new URL(`file://${configFile.replace(/\\/g, "/")}`),
			});

			assert.strictEqual(
				resolver(appDir, "@acme/utils"),
				path.resolve(fixture, "packages/utils/index.js"),
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
