const should = require("should");
const path = require("path");
const fs = require("fs");

const { ResolverFactory } = require("../");
const CachedInputFileSystem = require("../lib/CachedInputFileSystem");

/** @typedef {import("../lib/Resolver").ResolveContext} ResolveContext */
/** @typedef {ResolveContext & Required<Pick<ResolveContext, 'yield' | 'fileDependencies' | 'contextDependencies' | 'missingDependencies'>>} StrictResolveContext */

const nodeFileSystem = new CachedInputFileSystem(fs, 4000);
const fixtures = path.resolve(__dirname, "fixtures", "yield");
const makeFixturePaths = paths =>
	paths.map(pth => (pth ? path.join(fixtures, pth) : pth));
const contextifyDependencies = paths =>
	Array.from(paths)
		.filter(pth => pth.startsWith(fixtures))
		.map(pth => pth.slice(fixtures.length).split(path.sep).join("/"))
		.sort();
const beatifyLogs = logs =>
	logs.map(l => {
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

	it("should yield all b files", done => {
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
			should(err).be.eql(null);
			should(result).be.eql(undefined);
			should(paths).be.eql(makeFixturePaths(["/a/foo/b", "/a/foo-2/b"]));
			should(contextifyDependencies(fileDependencies)).be.eql([
				"",
				"/a",
				"/a/foo",
				"/a/foo-2",
				"/a/foo-2/b",
				"/a/foo/b"
			]);
			should(contextifyDependencies(missingDependencies)).be.eql([
				"/a/foo-2/b",
				"/a/foo-2/b.js",
				"/a/foo-2/package.json",
				"/a/foo/b",
				"/a/foo/b.js",
				"/a/foo/package.json",
				"/a/package.json",
				"/package.json"
			]);
			should(Array.from(contextDependencies).sort()).be.eql([]);
			done();
		});
	});

	it("should yield all foo files", done => {
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
			should(err).be.eql(null);
			should(result).be.eql(undefined);
			should(paths).be.eql(makeFixturePaths(["/a/foo/a", "/b/foo/a"]));
			should(contextifyDependencies(fileDependencies)).be.eql([
				"",
				"/a",
				"/a/foo",
				"/a/foo/a",
				"/b",
				"/b/foo",
				"/b/foo/a"
			]);
			should(contextifyDependencies(missingDependencies)).be.eql([
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
			should(Array.from(contextDependencies).sort()).be.eql([]);
			done();
		});
	});

	it("should yield c file", done => {
		const paths = [];
		const yield_ = ({ path }) => paths.push(path);
		/** @type {ResolveContext} */
		const context = {
			yield: yield_
		};

		resolver.resolve({}, fixtures, "index/c", context, (err, result) => {
			should(err).be.eql(null);
			should(result).be.eql(undefined);
			should(paths).be.eql(makeFixturePaths(["/a/foo-2/c"]));
			done();
		});
	});

	it("should resolve false alias", done => {
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
			should(err).be.eql(null);
			should(result).be.eql(undefined);
			should(paths).be.eql([false]);
			should(contextifyDependencies(fileDependencies)).be.eql([]);
			should(contextifyDependencies(missingDependencies)).be.eql([
				"/node_modules",
				"/package.json"
			]);
			should(Array.from(contextDependencies).sort()).be.eql([]);
			done();
		});
	});

	it("should return error if no resolve", done => {
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
			should(err).not.be.eql(null);
			should(err).not.be.eql(undefined);
			should(result).be.eql(undefined);
			should(paths).be.eql([]);
			should(contextifyDependencies(fileDependencies)).be.eql([]);
			should(contextifyDependencies(missingDependencies)).be.eql([
				"/a/foo-2/package.json",
				"/a/foo-2/unknown",
				"/a/foo-2/unknown.js",
				"/a/foo/package.json",
				"/a/foo/unknown",
				"/a/foo/unknown.js",
				"/a/package.json",
				"/package.json"
			]);
			should(Array.from(contextDependencies).sort()).be.eql([]);
			done();
		});
	});

	describe("resolve alias field", () => {
		it("should handle false in alias field", done => {
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
				log: l => logs.push(l)
			};

			resolver.resolve({}, fixtures, "index/a", context, (err, result) => {
				calls++;
				should(calls).be.eql(1);
				should(err).be.eql(null);
				should(result).be.eql(undefined);
				should(paths).be.eql([false]);
				should(contextifyDependencies(fileDependencies)).be.eql([
					"/c/foo/package.json"
				]);
				should(contextifyDependencies(missingDependencies)).be.eql([
					"/c/foo/a",
					"/c/foo/a.js",
					"/package.json"
				]);
				should(Array.from(contextDependencies).sort()).be.eql([]);
				should(beatifyLogs(logs)).be.eql([
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
			const createResolver = aliases =>
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

			it("default order", done => {
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

			it("reverse order", done => {
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
					log: l => logs.push(l)
				};

				resolver.resolve({}, fixtures, "index/a", context, (err, result) => {
					calls++;
					should(calls).be.eql(1);
					should(err).be.eql(null);
					should(result).be.eql(undefined);
					should(paths).be.eql(makeFixturePaths(expectedResult));
					should(contextifyDependencies(fileDependencies)).be.eql([
						"",
						"/a",
						"/a/foo",
						"/a/foo/a",
						"/c/foo/package.json"
					]);
					should(contextifyDependencies(missingDependencies)).be.eql([
						"/a/foo/a",
						"/a/foo/a.js",
						"/a/foo/package.json",
						"/a/package.json",
						"/c/foo/a",
						"/c/foo/a.js",
						"/package.json"
					]);
					should(Array.from(contextDependencies).sort()).be.eql([]);
					should(beatifyLogs(logs)).be.eql(expectedLogs);
					done();
				});
			}
		});

		describe("custom plugins", () => {
			const createResolver = plugin =>
				ResolverFactory.createResolver({
					extensions: [".js"],
					plugins: [plugin],
					fileSystem: nodeFileSystem
				});

			it("should correctly handle resolve in callback", done => {
				const getResult = request => ({ ...request, path: "/a" });
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
					yield: obj => paths.push(obj.path)
				};
				resolver.resolve({}, fixtures, "unknown", context, (err, result) => {
					if (err) done(err);
					should(err).be.eql(null);
					should(result).be.eql(undefined);
					should(paths).be.eql(["/a"]);
					done();
				});
			});

			it("should correctly handle error in callback", done => {
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
					yield: obj => paths.push(obj.path)
				};
				resolver.resolve({}, fixtures, "unknown", context, (err, result) => {
					should(err).not.be.eql(null);
					should(/** @type {Error} */ (err).message).be.eql("error");
					should(result).be.eql(undefined);
					should(paths).be.eql([]);
					done();
				});
			});
		});

		describe("unsafe cache", () => {
			// same case as in "should yield all b files"
			it("should return result from cache", done => {
				const cache = {};
				const resolver = ResolverFactory.createResolver({
					extensions: [".js"],
					alias: {
						index: makeFixturePaths(["/a/foo", "/a/foo-2"])
					},
					unsafeCache: cache,
					fileSystem: nodeFileSystem
				});
				resolver.resolve({}, fixtures, "index/b", { yield: () => {} }, err => {
					if (err) done(err);
					const paths = [];

					resolver.resolve(
						{},
						fixtures,
						"index/b",
						{ yield: obj => paths.push(obj.path) },
						(err, result) => {
							should(err).be.eql(null);
							should(result).be.eql(undefined);
							should(paths).be.eql(
								makeFixturePaths(["/a/foo/b", "/a/foo-2/b"])
							);
							// original + 2 aliases
							should(Object.keys(cache)).have.length(3);
							const cacheId = Object.keys(cache).find(id => {
								const { request } = JSON.parse(id);
								return request === "index/b";
							});
							should(cacheId).not.be.eql(undefined);
							should(
								Array.isArray(cache[/** @type {string} */ (cacheId)])
							).be.eql(true);
							should(
								cache[/** @type {string} */ (cacheId)].map(o => o.path)
							).be.eql(makeFixturePaths(["/a/foo/b", "/a/foo-2/b"]));
							done();
						}
					);
				});
			});

			// same as "should handle false in alias field"
			it("should return ignore result from cache", done => {
				const cache = {};
				const resolver = ResolverFactory.createResolver({
					extensions: [".js"],
					alias: {
						foo: false
					},
					unsafeCache: cache,
					fileSystem: nodeFileSystem
				});
				resolver.resolve({}, fixtures, "foo", { yield: () => {} }, err => {
					if (err) done(err);
					const paths = [];

					resolver.resolve(
						{},
						fixtures,
						"foo",
						{ yield: obj => paths.push(obj.path) },
						(err, result) => {
							should(err).be.eql(null);
							should(result).be.eql(undefined);
							should(paths).be.eql([false]);
							// original + 0 aliases
							should(Object.keys(cache)).have.length(1);
							const cacheId = Object.keys(cache)[0];
							should(cacheId).not.be.eql(undefined);
							should(
								Array.isArray(cache[/** @type {string} */ (cacheId)])
							).be.eql(true);
							should(
								cache[/** @type {string} */ (cacheId)].map(o => o.path)
							).be.eql([false]);
							done();
						}
					);
				});
			});
		});
	});
});
