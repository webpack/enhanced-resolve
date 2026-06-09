"use strict";

const assert = require("assert");
const fs = require("fs");

const path = require("path");

const { ResolverFactory } = require("../");
const CachedInputFileSystem = require("../lib/CachedInputFileSystem");
const { describe, it } = require("./_runner");

/** @typedef {import("../lib/Resolver").ResolveRequest} ResolveRequest */
/** @typedef {import("../lib/Resolver").ResolveContext} ResolveContext */
/** @typedef {import("../lib/UnsafeCachePlugin").Cache} Cache */
/** @typedef {ResolveContext & Required<Pick<ResolveContext, "yield" | "fileDependencies" | "contextDependencies" | "missingDependencies">>} StrictResolveContext */

const nodeFileSystem = new CachedInputFileSystem(fs, 4000);
const fixtures = path.resolve(__dirname, "fixtures", "yield");
const makeFixturePaths = (paths) =>
	paths.map((pth) => (pth ? path.join(fixtures, pth) : pth));
const contextifyDependencies = (paths) =>
	[...paths]
		.filter((pth) => pth.startsWith(fixtures))
		.map((pth) => pth.slice(fixtures.length).split(path.sep).join("/"))
		.sort();
const beatifyLogs = (logs) =>
	logs.map((l) => {
		const match = /^(\s+)using description file.+(\(relative path:.+\))$/.exec(
			l,
		);
		if (match) return `${match[1]}using description file ${match[2]}`;
		while (l.includes(fixtures)) l = l.replace(fixtures, "fixtures");
		return l;
	});

describe("should resolve all aliases", () => {
	const resolver = ResolverFactory.createResolver({
		extensions: [".js"],
		alias: {
			index: makeFixturePaths(["/a/foo", "/a/foo-2"]),
			foo: false,
		},
		aliasFields: ["browser"],
		fileSystem: nodeFileSystem,
	});
	const modulesResolver = ResolverFactory.createResolver({
		extensions: [".js"],
		modules: makeFixturePaths(["a", "b"]),
		fileSystem: nodeFileSystem,
	});

	it("should yield all b files", (t, done) => {
		const paths = [];
		const yield_ = ({ path }) => paths.push(path);
		const fileDependencies = new Set();
		const contextDependencies = new Set();
		const missingDependencies = new Set();
		/** @type {ResolveContext} */
		const context = {
			yield: yield_,
			fileDependencies,
			contextDependencies,
			missingDependencies,
		};

		resolver.resolve({}, fixtures, "index/b", context, (err, result) => {
			assert.strictEqual(err, null);
			assert.strictEqual(result, undefined);
			assert.deepStrictEqual(
				paths,
				makeFixturePaths(["/a/foo/b", "/a/foo-2/b"]),
			);
			assert.deepStrictEqual(contextifyDependencies(fileDependencies), [
				"",
				"/a",
				"/a/foo",
				"/a/foo-2",
				"/a/foo-2/b",
				"/a/foo/b",
			]);
			assert.deepStrictEqual(contextifyDependencies(missingDependencies), [
				"/a/foo-2/b",
				"/a/foo-2/b.js",
				"/a/foo-2/package.json",
				"/a/foo/b",
				"/a/foo/b.js",
				"/a/foo/package.json",
				"/a/package.json",
				"/package.json",
			]);
			assert.deepStrictEqual([...contextDependencies].sort(), []);
			done();
		});
	});

	it("should yield all foo files", (t, done) => {
		const paths = [];
		const yield_ = ({ path }) => paths.push(path);
		const fileDependencies = new Set();
		const contextDependencies = new Set();
		const missingDependencies = new Set();
		/** @type {ResolveContext} */
		const context = {
			yield: yield_,
			fileDependencies,
			contextDependencies,
			missingDependencies,
		};

		modulesResolver.resolve({}, fixtures, "foo/a", context, (err, result) => {
			assert.strictEqual(err, null);
			assert.strictEqual(result, undefined);
			assert.deepStrictEqual(paths, makeFixturePaths(["/a/foo/a", "/b/foo/a"]));
			assert.deepStrictEqual(contextifyDependencies(fileDependencies), [
				"",
				"/a",
				"/a/foo",
				"/a/foo/a",
				"/b",
				"/b/foo",
				"/b/foo/a",
			]);
			assert.deepStrictEqual(contextifyDependencies(missingDependencies), [
				"/a/foo/a",
				"/a/foo/a.js",
				"/a/foo/package.json",
				"/a/package.json",
				"/b/foo/a",
				"/b/foo/a.js",
				"/b/foo/package.json",
				"/b/package.json",
				"/package.json",
			]);
			assert.deepStrictEqual([...contextDependencies].sort(), []);
			done();
		});
	});

	it("should yield c file", (t, done) => {
		const paths = [];
		const yield_ = ({ path }) => paths.push(path);
		/** @type {ResolveContext} */
		const context = {
			yield: yield_,
		};

		resolver.resolve({}, fixtures, "index/c", context, (err, result) => {
			assert.strictEqual(err, null);
			assert.strictEqual(result, undefined);
			assert.deepStrictEqual(paths, makeFixturePaths(["/a/foo-2/c"]));
			done();
		});
	});

	it("should resolve false alias", (t, done) => {
		const paths = [];
		const yield_ = ({ path }) => paths.push(path);
		const fileDependencies = new Set();
		const contextDependencies = new Set();
		const missingDependencies = new Set();
		/** @type {ResolveContext} */
		const context = {
			yield: yield_,
			fileDependencies,
			contextDependencies,
			missingDependencies,
		};

		resolver.resolve({}, fixtures, "foo", context, (err, result) => {
			assert.strictEqual(err, null);
			assert.strictEqual(result, undefined);
			assert.deepStrictEqual(paths, [false]);
			assert.deepStrictEqual(contextifyDependencies(fileDependencies), []);
			assert.deepStrictEqual(contextifyDependencies(missingDependencies), [
				"/node_modules",
				"/package.json",
			]);
			assert.deepStrictEqual([...contextDependencies].sort(), []);
			done();
		});
	});

	it("should return error if no resolve", (t, done) => {
		const paths = [];
		const yield_ = ({ path }) => paths.push(path);
		const fileDependencies = new Set();
		const contextDependencies = new Set();
		const missingDependencies = new Set();
		/** @type {ResolveContext} */
		const context = {
			yield: yield_,
			fileDependencies,
			contextDependencies,
			missingDependencies,
		};

		resolver.resolve({}, fixtures, "index/unknown", context, (err, result) => {
			assert.notStrictEqual(err, null);
			assert.notStrictEqual(err, undefined);
			assert.strictEqual(result, undefined);
			assert.deepStrictEqual(paths, []);
			assert.deepStrictEqual(contextifyDependencies(fileDependencies), []);
			assert.deepStrictEqual(contextifyDependencies(missingDependencies), [
				"/a/foo-2/package.json",
				"/a/foo-2/unknown",
				"/a/foo-2/unknown.js",
				"/a/foo/package.json",
				"/a/foo/unknown",
				"/a/foo/unknown.js",
				"/a/package.json",
				"/package.json",
			]);
			assert.deepStrictEqual([...contextDependencies].sort(), []);
			done();
		});
	});

	describe("resolve alias field", () => {
		it("should handle false in alias field", (t, done) => {
			const resolver = ResolverFactory.createResolver({
				extensions: [".js"],
				alias: {
					index: makeFixturePaths(["/c/foo"]),
				},
				aliasFields: ["browser"],
				fileSystem: nodeFileSystem,
			});
			let calls = 0;
			const paths = [];
			const logs = [];
			const yield_ = ({ path }) => {
				paths.push(path);
			};
			const fileDependencies = new Set();
			const contextDependencies = new Set();
			const missingDependencies = new Set();
			/** @type {ResolveContext} */
			const context = {
				yield: yield_,
				fileDependencies,
				contextDependencies,
				missingDependencies,
				log: (l) => logs.push(l),
			};

			resolver.resolve({}, fixtures, "index/a", context, (err, result) => {
				calls++;
				assert.strictEqual(calls, 1);
				assert.strictEqual(err, null);
				assert.strictEqual(result, undefined);
				assert.deepStrictEqual(paths, [false]);
				assert.deepStrictEqual(contextifyDependencies(fileDependencies), [
					"/c/foo/package.json",
				]);
				assert.deepStrictEqual(contextifyDependencies(missingDependencies), [
					"/c/foo/a",
					"/c/foo/a.js",
					"/package.json",
				]);
				assert.deepStrictEqual([...contextDependencies].sort(), []);

				assert.deepStrictEqual(beatifyLogs(logs), [
					"resolve 'index/a' in 'fixtures'",
					"  Parsed request is a module",
					"  using description file (relative path: ./test/fixtures/yield)",
					`    aliased with mapping 'index': '${["fixtures", "c", "foo"].join(
						path.sep,
					)}' to '${["fixtures", "c", "foo"].join(path.sep)}/a'`,
					"      using description file (relative path: ./test/fixtures/yield)",
					"        using description file (relative path: ./a)",
					"          .js",
					`            ${["fixtures", "c", "foo", "a.js"].join(
						path.sep,
					)} doesn't exist`,
					"          as directory",
					`            ${["fixtures", "c", "foo", "a"].join(
						path.sep,
					)} is not a directory`,
				]);

				done();
			});
		});

		describe("alias + alias field", () => {
			const createResolver = (aliases) =>
				ResolverFactory.createResolver({
					extensions: [".js"],
					alias: {
						index: makeFixturePaths(aliases),
					},
					aliasFields: ["browser"],
					fileSystem: nodeFileSystem,
				});
			const cLog = [
				`    aliased with mapping 'index': '${["fixtures", "c", "foo"].join(
					path.sep,
				)}' to '${["fixtures", "c", "foo"].join(path.sep)}/a'`,
				"      using description file (relative path: ./test/fixtures/yield)",
				"        using description file (relative path: ./a)",
				"          .js",
				`            ${["fixtures", "c", "foo", "a.js"].join(
					path.sep,
				)} doesn't exist`,
				"          as directory",
				`            ${["fixtures", "c", "foo", "a"].join(
					path.sep,
				)} is not a directory`,
			];
			const aLog = [
				`    aliased with mapping 'index': '${["fixtures", "a", "foo"].join(
					path.sep,
				)}' to '${["fixtures", "a", "foo"].join(path.sep)}/a'`,
				"      using description file (relative path: ./test/fixtures/yield)",
				"        using description file (relative path: ./test/fixtures/yield/a/foo/a)",
				"          no extension",
				`            existing file: ${["fixtures", "a", "foo", "a"].join(
					path.sep,
				)}`,
				`              reporting result ${["fixtures", "a", "foo", "a"].join(
					path.sep,
				)}`,
				"          .js",
				`            ${["fixtures", "a", "foo", "a.js"].join(
					path.sep,
				)} doesn't exist`,
				"          as directory",
				`            ${["fixtures", "a", "foo", "a"].join(
					path.sep,
				)} is not a directory`,
			];
			let resolver;

			/**
			 * @param {(err?: null) => void} done done
			 * @param {(string | false)[]} expectedResult expected result
			 * @param {string[]} expectedLogs expected logs
			 */
			function run(done, expectedResult, expectedLogs) {
				let calls = 0;
				const paths = [];
				const logs = [];
				const yield_ = ({ path }) => paths.push(path);
				const fileDependencies = new Set();
				const contextDependencies = new Set();
				const missingDependencies = new Set();
				/** @type {ResolveContext} */
				const context = {
					yield: yield_,
					fileDependencies,
					contextDependencies,
					missingDependencies,
					log: (l) => logs.push(l),
				};

				resolver.resolve({}, fixtures, "index/a", context, (err, result) => {
					calls++;
					assert.strictEqual(calls, 1);
					assert.strictEqual(err, null);
					assert.strictEqual(result, undefined);
					assert.deepStrictEqual(paths, makeFixturePaths(expectedResult));
					assert.deepStrictEqual(contextifyDependencies(fileDependencies), [
						"",
						"/a",
						"/a/foo",
						"/a/foo/a",
						"/c/foo/package.json",
					]);
					assert.deepStrictEqual(contextifyDependencies(missingDependencies), [
						"/a/foo/a",
						"/a/foo/a.js",
						"/a/foo/package.json",
						"/a/package.json",
						"/c/foo/a",
						"/c/foo/a.js",
						"/package.json",
					]);
					assert.deepStrictEqual([...contextDependencies].sort(), []);
					assert.deepStrictEqual(beatifyLogs(logs), expectedLogs);

					done();
				});
			}

			it("default order", (t, done) => {
				resolver = createResolver(["/c/foo", "/a/foo"]);
				run(
					done,
					[false, "/a/foo/a"],
					[
						"resolve 'index/a' in 'fixtures'",
						"  Parsed request is a module",
						"  using description file (relative path: ./test/fixtures/yield)",
						...cLog,
						...aLog,
					],
				);
			});

			it("reverse order", (t, done) => {
				resolver = createResolver(["/a/foo", "/c/foo"]);
				run(
					done,
					["/a/foo/a", false],
					[
						"resolve 'index/a' in 'fixtures'",
						"  Parsed request is a module",
						"  using description file (relative path: ./test/fixtures/yield)",
						...aLog,
						...cLog,
					],
				);
			});
		});

		describe("custom plugins", () => {
			const createResolver = (plugin) =>
				ResolverFactory.createResolver({
					extensions: [".js"],
					plugins: [plugin],
					fileSystem: nodeFileSystem,
				});

			it("should correctly handle resolve in callback", (t, done) => {
				const getResult = (request) => ({ ...request, path: "/a" });
				const resolver = createResolver({
					apply(resolver) {
						resolver
							.getHook("described-resolve")
							.tapAsync(
								"MyResolverPlugin",
								(request, resolveContext, callback) => {
									callback(null, getResult(request));
								},
							);
					},
				});
				const paths = [];
				const context = {
					yield: (obj) => paths.push(obj.path),
				};
				resolver.resolve({}, fixtures, "unknown", context, (err, result) => {
					if (err) done(err);
					assert.strictEqual(err, null);
					assert.strictEqual(result, undefined);
					assert.deepStrictEqual(paths, ["/a"]);
					done();
				});
			});

			it("should correctly handle error in callback", (t, done) => {
				const resolver = createResolver({
					apply(resolver) {
						resolver
							.getHook("described-resolve")
							.tapAsync("MyResolverPlugin", (_, __, callback) =>
								callback(new Error("error")),
							);
					},
				});
				const paths = [];
				const context = {
					yield: (obj) => paths.push(obj.path),
				};
				resolver.resolve({}, fixtures, "unknown", context, (err, result) => {
					if (!err) return done(new Error("error expected"));
					assert.notStrictEqual(err, null);
					assert.strictEqual(err.message, "error");
					assert.strictEqual(result, undefined);
					assert.deepStrictEqual(paths, []);
					done();
				});
			});
		});

		describe("unsafe cache", () => {
			// same case as in "should yield all b files"
			it("should return result from cache", (t, done) => {
				const cache = /** @type {Cache} */ ({});
				const resolver = ResolverFactory.createResolver({
					extensions: [".js"],
					alias: {
						index: makeFixturePaths(["/a/foo", "/a/foo-2"]),
					},
					unsafeCache: cache,
					fileSystem: nodeFileSystem,
				});
				resolver.resolve(
					{},
					fixtures,
					"index/b",
					{ yield: () => {} },
					(err) => {
						if (err) done(err);
						const paths = [];

						resolver.resolve(
							{},
							fixtures,
							"index/b",
							{ yield: (obj) => paths.push(obj.path) },
							(err, result) => {
								assert.strictEqual(err, null);
								assert.strictEqual(result, undefined);
								assert.deepStrictEqual(
									paths,
									makeFixturePaths(["/a/foo/b", "/a/foo-2/b"]),
								);
								// original + 2 aliases
								assert.strictEqual(Object.keys(cache).length, 3);

								const cacheId =
									/** @type {string} */
									(
										Object.keys(cache).find((id) => {
											// Cache keys are "type\0context\0path\0query\0fragment\0request".
											// We only need the request field for this assertion.
											// const parts = id.split("\0");
											// return parts[parts.length - 1] === "index/b";

											const { request } = JSON.parse(id);
											return request === "index/b";
										})
									);
								assert.notStrictEqual(cacheId, undefined);
								assert.strictEqual(Array.isArray(cache[cacheId]), true);
								assert.deepStrictEqual(
									/** @type {ResolveRequest[]} */
									(cache[cacheId]).map((req) => req.path),
									makeFixturePaths(["/a/foo/b", "/a/foo-2/b"]),
								);
								done();
							},
						);
					},
				);
			});

			// same as "should handle false in alias field"
			it("should return ignore result from cache", (t, done) => {
				const cache = /** @type {Cache} */ ({});
				const resolver = ResolverFactory.createResolver({
					extensions: [".js"],
					alias: {
						foo: false,
					},
					unsafeCache: cache,
					fileSystem: nodeFileSystem,
				});
				resolver.resolve({}, fixtures, "foo", { yield: () => {} }, (err) => {
					if (err) done(err);
					const paths = [];

					resolver.resolve(
						{},
						fixtures,
						"foo",
						{ yield: (obj) => paths.push(obj.path) },
						(err, result) => {
							assert.strictEqual(err, null);
							assert.strictEqual(result, undefined);
							assert.deepStrictEqual(paths, [false]);

							// original + 0 aliases
							assert.strictEqual(Object.keys(cache).length, 1);

							const [cacheId] = Object.keys(cache);
							assert.notStrictEqual(cacheId, undefined);
							assert.strictEqual(Array.isArray(cache[cacheId]), true);
							assert.deepStrictEqual(
								/** @type {ResolveRequest[]} */
								(cache[cacheId]).map((req) => req.path),
								[false],
							);
							done();
						},
					);
				});
			});
		});
	});
});
