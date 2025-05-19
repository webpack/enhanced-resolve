const path = require("path");
const fs = require("fs");

const { ResolverFactory } = require("../");
const CachedInputFileSystem = require("../lib/CachedInputFileSystem");

/** @typedef {import("../lib/Resolver").ResolveContext} ResolveContext */
/** @typedef {ResolveContext & Required<Pick<ResolveContext, 'yield' | 'fileDependencies' | 'contextDependencies' | 'missingDependencies'>>} StrictResolveContext */

const nodeFileSystem = new CachedInputFileSystem(fs, 4000);
const fixtures = path.resolve(__dirname, "fixtures", "yield");
const makeFixturePaths = (paths) =>
	paths.map((pth) => (pth ? path.join(fixtures, pth) : pth));
const contextifyDependencies = (paths) =>
	Array.from(paths)
		.filter((pth) => pth.startsWith(fixtures))
		.map((pth) => pth.slice(fixtures.length).split(path.sep).join("/"))
		.sort();
const beatifyLogs = (logs) =>
	logs.map((l) => {
		const match = /^(\s+)using description file.+(\(relative path:.+\))$/.exec(
			l
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
			foo: false
		},
		aliasFields: ["browser"],
		fileSystem: nodeFileSystem
	});
	const modulesResolver = ResolverFactory.createResolver({
		extensions: [".js"],
		modules: makeFixturePaths(["a", "b"]),
		fileSystem: nodeFileSystem
	});

	it("should yield all b files", (done) => {
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
			missingDependencies
		};

		resolver.resolve({}, fixtures, "index/b", context, (err, result) => {
			expect(err).toEqual(null);
			expect(result).toBeUndefined();
			expect(paths).toEqual(makeFixturePaths(["/a/foo/b", "/a/foo-2/b"]));
			expect(contextifyDependencies(fileDependencies)).toEqual([
				"",
				"/a",
				"/a/foo",
				"/a/foo-2",
				"/a/foo-2/b",
				"/a/foo/b"
			]);
			expect(contextifyDependencies(missingDependencies)).toEqual([
				"/a/foo-2/b",
				"/a/foo-2/b.js",
				"/a/foo-2/package.json",
				"/a/foo/b",
				"/a/foo/b.js",
				"/a/foo/package.json",
				"/a/package.json",
				"/package.json"
			]);
			expect(Array.from(contextDependencies).sort()).toEqual([]);
			done();
		});
	});

	it("should yield all foo files", (done) => {
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
			missingDependencies
		};

		modulesResolver.resolve({}, fixtures, "foo/a", context, (err, result) => {
			expect(err).toEqual(null);
			expect(result).toBeUndefined();
			expect(paths).toEqual(makeFixturePaths(["/a/foo/a", "/b/foo/a"]));
			expect(contextifyDependencies(fileDependencies)).toEqual([
				"",
				"/a",
				"/a/foo",
				"/a/foo/a",
				"/b",
				"/b/foo",
				"/b/foo/a"
			]);
			expect(contextifyDependencies(missingDependencies)).toEqual([
				"/a/foo/a",
				"/a/foo/a.js",
				"/a/foo/package.json",
				"/a/package.json",
				"/b/foo/a",
				"/b/foo/a.js",
				"/b/foo/package.json",
				"/b/package.json",
				"/package.json"
			]);
			expect(Array.from(contextDependencies).sort()).toEqual([]);
			done();
		});
	});

	it("should yield c file", (done) => {
		const paths = [];
		const yield_ = ({ path }) => paths.push(path);
		/** @type {ResolveContext} */
		const context = {
			yield: yield_
		};

		resolver.resolve({}, fixtures, "index/c", context, (err, result) => {
			expect(err).toEqual(null);
			expect(result).toBeUndefined();
			expect(paths).toEqual(makeFixturePaths(["/a/foo-2/c"]));
			done();
		});
	});

	it("should resolve false alias", (done) => {
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
			missingDependencies
		};

		resolver.resolve({}, fixtures, "foo", context, (err, result) => {
			expect(err).toEqual(null);
			expect(result).toBeUndefined();
			expect(paths).toEqual([false]);
			expect(contextifyDependencies(fileDependencies)).toEqual([]);
			expect(contextifyDependencies(missingDependencies)).toEqual([
				"/node_modules",
				"/package.json"
			]);
			expect(Array.from(contextDependencies).sort()).toEqual([]);
			done();
		});
	});

	it("should return error if no resolve", (done) => {
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
			missingDependencies
		};

		resolver.resolve({}, fixtures, "index/unknown", context, (err, result) => {
			expect(err).not.toEqual(null);
			expect(err).not.toBeUndefined();
			expect(result).toBeUndefined();
			expect(paths).toEqual([]);
			expect(contextifyDependencies(fileDependencies)).toEqual([]);
			expect(contextifyDependencies(missingDependencies)).toEqual([
				"/a/foo-2/package.json",
				"/a/foo-2/unknown",
				"/a/foo-2/unknown.js",
				"/a/foo/package.json",
				"/a/foo/unknown",
				"/a/foo/unknown.js",
				"/a/package.json",
				"/package.json"
			]);
			expect(Array.from(contextDependencies).sort()).toEqual([]);
			done();
		});
	});

	describe("resolve alias field", () => {
		it("should handle false in alias field", (done) => {
			const resolver = ResolverFactory.createResolver({
				extensions: [".js"],
				alias: {
					index: makeFixturePaths(["/c/foo"])
				},
				aliasFields: ["browser"],
				fileSystem: nodeFileSystem
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
				log: (l) => logs.push(l)
			};

			resolver.resolve({}, fixtures, "index/a", context, (err, result) => {
				calls++;
				expect(calls).toEqual(1);
				expect(err).toEqual(null);
				expect(result).toBeUndefined();
				expect(paths).toEqual([false]);
				expect(contextifyDependencies(fileDependencies)).toEqual([
					"/c/foo/package.json"
				]);
				expect(contextifyDependencies(missingDependencies)).toEqual([
					"/c/foo/a",
					"/c/foo/a.js",
					"/package.json"
				]);
				expect(Array.from(contextDependencies).sort()).toEqual([]);

				expect(beatifyLogs(logs)).toEqual([
					"resolve 'index/a' in 'fixtures'",
					"  Parsed request is a module",
					"  using description file (relative path: ./test/fixtures/yield)",
					`    aliased with mapping 'index': '${["fixtures", "c", "foo"].join(
						path.sep
					)}' to '${["fixtures", "c", "foo"].join(path.sep)}/a'`,
					"      using description file (relative path: ./test/fixtures/yield)",
					"        using description file (relative path: ./a)",
					"          .js",
					`            ${["fixtures", "c", "foo", "a.js"].join(
						path.sep
					)} doesn't exist`,
					"          as directory",
					`            ${["fixtures", "c", "foo", "a"].join(
						path.sep
					)} is not a directory`
				]);

				done();
			});
		});

		describe("alias + alias field", () => {
			const createResolver = (aliases) =>
				ResolverFactory.createResolver({
					extensions: [".js"],
					alias: {
						index: makeFixturePaths(aliases)
					},
					aliasFields: ["browser"],
					fileSystem: nodeFileSystem
				});
			const cLog = [
				`    aliased with mapping 'index': '${["fixtures", "c", "foo"].join(
					path.sep
				)}' to '${["fixtures", "c", "foo"].join(path.sep)}/a'`,
				"      using description file (relative path: ./test/fixtures/yield)",
				"        using description file (relative path: ./a)",
				"          .js",
				`            ${["fixtures", "c", "foo", "a.js"].join(
					path.sep
				)} doesn't exist`,
				"          as directory",
				`            ${["fixtures", "c", "foo", "a"].join(
					path.sep
				)} is not a directory`
			];
			const aLog = [
				`    aliased with mapping 'index': '${["fixtures", "a", "foo"].join(
					path.sep
				)}' to '${["fixtures", "a", "foo"].join(path.sep)}/a'`,
				"      using description file (relative path: ./test/fixtures/yield)",
				"        using description file (relative path: ./test/fixtures/yield/a/foo/a)",
				"          no extension",
				`            existing file: ${["fixtures", "a", "foo", "a"].join(
					path.sep
				)}`,
				`              reporting result ${["fixtures", "a", "foo", "a"].join(
					path.sep
				)}`,
				"          .js",
				`            ${["fixtures", "a", "foo", "a.js"].join(
					path.sep
				)} doesn't exist`,
				"          as directory",
				`            ${["fixtures", "a", "foo", "a"].join(
					path.sep
				)} is not a directory`
			];
			let resolver;

			it("default order", (done) => {
				resolver = createResolver(["/c/foo", "/a/foo"]);
				run(
					done,
					[false, "/a/foo/a"],
					[
						"resolve 'index/a' in 'fixtures'",
						"  Parsed request is a module",
						"  using description file (relative path: ./test/fixtures/yield)",
						...cLog,
						...aLog
					]
				);
			});

			it("reverse order", (done) => {
				resolver = createResolver(["/a/foo", "/c/foo"]);
				run(
					done,
					["/a/foo/a", false],
					[
						"resolve 'index/a' in 'fixtures'",
						"  Parsed request is a module",
						"  using description file (relative path: ./test/fixtures/yield)",
						...aLog,
						...cLog
					]
				);
			});

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
					log: (l) => logs.push(l)
				};

				resolver.resolve({}, fixtures, "index/a", context, (err, result) => {
					calls++;
					expect(calls).toEqual(1);
					expect(err).toEqual(null);
					expect(result).toBeUndefined();
					expect(paths).toEqual(makeFixturePaths(expectedResult));
					expect(contextifyDependencies(fileDependencies)).toEqual([
						"",
						"/a",
						"/a/foo",
						"/a/foo/a",
						"/c/foo/package.json"
					]);
					expect(contextifyDependencies(missingDependencies)).toEqual([
						"/a/foo/a",
						"/a/foo/a.js",
						"/a/foo/package.json",
						"/a/package.json",
						"/c/foo/a",
						"/c/foo/a.js",
						"/package.json"
					]);
					expect(Array.from(contextDependencies).sort()).toEqual([]);
					expect(beatifyLogs(logs)).toEqual(expectedLogs);

					done();
				});
			}
		});

		describe("custom plugins", () => {
			const createResolver = (plugin) =>
				ResolverFactory.createResolver({
					extensions: [".js"],
					plugins: [plugin],
					fileSystem: nodeFileSystem
				});

			it("should correctly handle resolve in callback", (done) => {
				const getResult = (request) => ({ ...request, path: "/a" });
				const resolver = createResolver({
					apply(resolver) {
						resolver
							.getHook("described-resolve")
							.tapAsync(
								"MyResolverPlugin",
								(request, resolveContext, callback) => {
									callback(null, getResult(request));
								}
							);
					}
				});
				const paths = [];
				const context = {
					yield: (obj) => paths.push(obj.path)
				};
				resolver.resolve({}, fixtures, "unknown", context, (err, result) => {
					if (err) done(err);
					expect(err).toBeNull();
					expect(result).toBeUndefined();
					expect(paths).toEqual(["/a"]);
					done();
				});
			});

			it("should correctly handle error in callback", (done) => {
				const resolver = createResolver({
					apply(resolver) {
						resolver
							.getHook("described-resolve")
							.tapAsync("MyResolverPlugin", (_, __, callback) =>
								callback(new Error("error"))
							);
					}
				});
				const paths = [];
				const context = {
					yield: (obj) => paths.push(obj.path)
				};
				resolver.resolve({}, fixtures, "unknown", context, (err, result) => {
					if (!err) return done(new Error("error expected"));
					expect(err).not.toBe(null);
					expect(err.message).toBe("error");
					expect(result).toBeUndefined();
					expect(paths).toEqual([]);
					done();
				});
			});
		});

		describe("unsafe cache", () => {
			// same case as in "should yield all b files"
			it("should return result from cache", (done) => {
				const cache = {};
				const resolver = ResolverFactory.createResolver({
					extensions: [".js"],
					alias: {
						index: makeFixturePaths(["/a/foo", "/a/foo-2"])
					},
					unsafeCache: cache,
					fileSystem: nodeFileSystem
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
								expect(err).toBe(null);
								expect(result).toBeUndefined();
								expect(paths).toEqual(
									makeFixturePaths(["/a/foo/b", "/a/foo-2/b"])
								);
								// original + 2 aliases
								expect(Object.keys(cache)).toHaveLength(3);

								const cacheId = Object.keys(cache).find((id) => {
									const { request } = JSON.parse(id);
									return request === "index/b";
								});
								expect(cacheId).not.toBeUndefined();
								expect(Array.isArray(cache[cacheId])).toBe(true);
								expect(cache[cacheId].map((o) => o.path)).toEqual(
									makeFixturePaths(["/a/foo/b", "/a/foo-2/b"])
								);
								done();
							}
						);
					}
				);
			});

			// same as "should handle false in alias field"
			it("should return ignore result from cache", (done) => {
				const cache = {};
				const resolver = ResolverFactory.createResolver({
					extensions: [".js"],
					alias: {
						foo: false
					},
					unsafeCache: cache,
					fileSystem: nodeFileSystem
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
							expect(err).toBe(null);
							expect(result).toBeUndefined();
							expect(paths).toEqual([false]);

							// original + 0 aliases
							expect(Object.keys(cache)).toHaveLength(1);

							const cacheId = Object.keys(cache)[0];
							expect(cacheId).not.toBeUndefined();
							expect(Array.isArray(cache[cacheId])).toBe(true);
							expect(cache[cacheId].map((o) => o.path)).toEqual([false]);
							done();
						}
					);
				});
			});
		});
	});
});
