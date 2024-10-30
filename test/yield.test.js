const path = require("path");
const fs = require("fs");

const { ResolverFactory } = require("../");
const CachedInputFileSystem = require("../lib/CachedInputFileSystem");
const {
	posixSep,
	transferPathToPosix,
	obps
} = require("./util/path-separator");

/** @typedef {import("../lib/Resolver").ResolveContext} ResolveContext */
/** @typedef {ResolveContext & Required<Pick<ResolveContext, 'yield' | 'fileDependencies' | 'contextDependencies' | 'missingDependencies'>>} StrictResolveContext */

// Functions below sometime handle transferPathToPosix and based on reading of test file you can see, that
// sometimes absolute paths started with obps (osBasedPathSeparator) and not absoluteOsBasedPath. That's because we use path.join too much in this test,
// and it works tricky on platforms:
// > path.posix.join('/abc/ab', '/abc/de') -> '/abc/ab/abc/de' (correct path after all, )
// > path.win32.join('X:\\a', 'X:\\b') -> 'X:\\a\\X:\\b' (not so correct when we pass two absolute paths to path.join)
// That's why we use obps sometimes, because:
// > path.join("X:\\example", "\case") -> 'X:\\example\\case'
const nodeFileSystem = new CachedInputFileSystem(fs, 4000);
const fixtures = path.resolve(__dirname, "fixtures", "yield");
const makeFixturePathsForLibrary = paths =>
	paths.map(pth => (pth ? path.join(fixtures, pth) : pth));
const makeFixturePaths = paths =>
	paths.map(pth => (pth ? transferPathToPosix(path.join(fixtures, pth)) : pth));
const contextifyDependencies = paths =>
	Array.from(paths)
		.filter(pth => pth.startsWith(transferPathToPosix(fixtures)))
		.map(pth => pth.slice(transferPathToPosix(fixtures).length))
		.sort();
const beatifyLogs = logs =>
	logs.map(l => {
		const match = /^(\s+)using description file.+(\(relative path:.+\))$/.exec(
			l
		);
		if (match) return `${match[1]}using description file ${match[2]}`;
		while (l.includes(transferPathToPosix(fixtures)))
			l = l.replace(transferPathToPosix(fixtures), "fixtures");
		return l;
	});

describe("should resolve all aliases", () => {
	const resolver = ResolverFactory.createResolver({
		extensions: [".js"],
		alias: {
			index: makeFixturePathsForLibrary([
				`${obps}a${obps}foo`,
				`${obps}a${obps}foo-2`
			]),
			foo: false
		},
		aliasFields: ["browser"],
		fileSystem: nodeFileSystem
	});
	const modulesResolver = ResolverFactory.createResolver({
		extensions: [".js"],
		modules: makeFixturePathsForLibrary(["a", "b"]),
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

		resolver.resolve({}, fixtures, `index${obps}b`, context, (err, result) => {
			expect(err).toEqual(null);
			expect(result).toBeUndefined();
			expect(paths).toEqual(
				makeFixturePaths([
					`${obps}a${obps}foo${obps}b`,
					`${obps}a${obps}foo-2${obps}b`
				])
			);
			expect(contextifyDependencies(fileDependencies)).toEqual([
				"",
				`${posixSep}a`,
				`${posixSep}a${posixSep}foo`,
				`${posixSep}a${posixSep}foo-2`,
				`${posixSep}a${posixSep}foo-2${posixSep}b`,
				`${posixSep}a${posixSep}foo${posixSep}b`
			]);
			expect(contextifyDependencies(missingDependencies)).toEqual([
				`${posixSep}a${posixSep}foo-2${posixSep}b`,
				`${posixSep}a${posixSep}foo-2${posixSep}b.js`,
				`${posixSep}a${posixSep}foo-2${posixSep}package.json`,
				`${posixSep}a${posixSep}foo${posixSep}b`,
				`${posixSep}a${posixSep}foo${posixSep}b.js`,
				`${posixSep}a${posixSep}foo${posixSep}package.json`,
				`${posixSep}a${posixSep}package.json`,
				`${posixSep}package.json`
			]);
			expect(Array.from(contextDependencies).sort()).toEqual([]);
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

		modulesResolver.resolve(
			{},
			fixtures,
			`foo${obps}a`,
			context,
			(err, result) => {
				expect(err).toEqual(null);
				expect(result).toBeUndefined();
				expect(paths).toEqual(
					makeFixturePaths([
						`${obps}a${obps}foo${obps}a`,
						`${obps}b${obps}foo${obps}a`
					])
				);
				expect(contextifyDependencies(fileDependencies)).toEqual([
					"",
					`${posixSep}a`,
					`${posixSep}a${posixSep}foo`,
					`${posixSep}a${posixSep}foo${posixSep}a`,
					`${posixSep}b`,
					`${posixSep}b${posixSep}foo`,
					`${posixSep}b${posixSep}foo${posixSep}a`
				]);
				expect(contextifyDependencies(missingDependencies)).toEqual([
					`${posixSep}a${posixSep}foo${posixSep}a`,
					`${posixSep}a${posixSep}foo${posixSep}a.js`,
					`${posixSep}a${posixSep}foo${posixSep}package.json`,
					`${posixSep}a${posixSep}package.json`,
					`${posixSep}b${posixSep}foo${posixSep}a`,
					`${posixSep}b${posixSep}foo${posixSep}a.js`,
					`${posixSep}b${posixSep}foo${posixSep}package.json`,
					`${posixSep}b${posixSep}package.json`,
					`${posixSep}package.json`
				]);
				expect(Array.from(contextDependencies).sort()).toEqual([]);
				done();
			}
		);
	});

	it("should yield c file", done => {
		const paths = [];
		const yield_ = ({ path }) => paths.push(path);
		/** @type {ResolveContext} */
		const context = {
			yield: yield_
		};

		resolver.resolve({}, fixtures, `index${obps}c`, context, (err, result) => {
			expect(err).toEqual(null);
			expect(result).toBeUndefined();
			expect(paths).toEqual(makeFixturePaths([`${obps}a${obps}foo-2${obps}c`]));
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
			expect(err).toEqual(null);
			expect(result).toBeUndefined();
			expect(paths).toEqual([false]);
			expect(contextifyDependencies(fileDependencies)).toEqual([]);
			expect(contextifyDependencies(missingDependencies)).toEqual([
				`${posixSep}node_modules`,
				`${posixSep}package.json`
			]);
			expect(Array.from(contextDependencies).sort()).toEqual([]);
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

		resolver.resolve(
			{},
			fixtures,
			`index${obps}unknown`,
			context,
			(err, result) => {
				expect(err).not.toEqual(null);
				expect(err).not.toBeUndefined();
				expect(result).toBeUndefined();
				expect(paths).toEqual([]);
				expect(contextifyDependencies(fileDependencies)).toEqual([]);
				expect(contextifyDependencies(missingDependencies)).toEqual([
					`${posixSep}a${posixSep}foo-2${posixSep}package.json`,
					`${posixSep}a${posixSep}foo-2${posixSep}unknown`,
					`${posixSep}a${posixSep}foo-2${posixSep}unknown.js`,
					`${posixSep}a${posixSep}foo${posixSep}package.json`,
					`${posixSep}a${posixSep}foo${posixSep}unknown`,
					`${posixSep}a${posixSep}foo${posixSep}unknown.js`,
					`${posixSep}a${posixSep}package.json`,
					`${posixSep}package.json`
				]);
				expect(Array.from(contextDependencies).sort()).toEqual([]);
				done();
			}
		);
	});

	describe("resolve alias field", () => {
		it("should handle false in alias field", done => {
			const resolver = ResolverFactory.createResolver({
				extensions: [".js"],
				alias: {
					index: makeFixturePathsForLibrary([`${obps}c${obps}foo`])
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

			resolver.resolve(
				{},
				fixtures,
				`index${obps}a`,
				context,
				(err, result) => {
					calls++;
					expect(calls).toEqual(1);
					expect(err).toEqual(null);
					expect(result).toBeUndefined();
					expect(paths).toEqual([false]);
					expect(contextifyDependencies(fileDependencies)).toEqual([
						`${posixSep}c${posixSep}foo${posixSep}package.json`
					]);
					expect(contextifyDependencies(missingDependencies)).toEqual([
						`${posixSep}c${posixSep}foo${posixSep}a`,
						`${posixSep}c${posixSep}foo${posixSep}a.js`,
						`${posixSep}package.json`
					]);
					expect(Array.from(contextDependencies).sort()).toEqual([]);

					expect(beatifyLogs(logs)).toEqual([
						`resolve 'index${posixSep}a' in 'fixtures'`,
						"  Parsed request is a module",
						`  using description file (relative path: .${posixSep}test${posixSep}fixtures${posixSep}yield)`,
						`    aliased with mapping 'index': '${["fixtures", "c", "foo"].join(
							posixSep
						)}' to '${["fixtures", "c", "foo"].join(posixSep)}${posixSep}a'`,
						`      using description file (relative path: .${posixSep}test${posixSep}fixtures${posixSep}yield)`,
						`        using description file (relative path: .${posixSep}a)`,
						"          .js",
						`            ${["fixtures", "c", "foo", "a.js"].join(
							posixSep
						)} doesn't exist`,
						"          as directory",
						`            ${["fixtures", "c", "foo", "a"].join(
							posixSep
						)} is not a directory`
					]);

					done();
				}
			);
		});

		describe("alias + alias field", () => {
			const createResolver = aliases =>
				ResolverFactory.createResolver({
					extensions: [".js"],
					alias: {
						index: makeFixturePathsForLibrary(aliases)
					},
					aliasFields: ["browser"],
					fileSystem: nodeFileSystem
				});
			const cLog = [
				`    aliased with mapping 'index': '${["fixtures", "c", "foo"].join(
					posixSep
				)}' to '${["fixtures", "c", "foo"].join(posixSep)}${posixSep}a'`,
				`      using description file (relative path: .${posixSep}test${posixSep}fixtures${posixSep}yield)`,
				`        using description file (relative path: .${posixSep}a)`,
				"          .js",
				`            ${["fixtures", "c", "foo", "a.js"].join(
					posixSep
				)} doesn't exist`,
				"          as directory",
				`            ${["fixtures", "c", "foo", "a"].join(
					posixSep
				)} is not a directory`
			];
			const aLog = [
				`    aliased with mapping 'index': '${["fixtures", "a", "foo"].join(
					posixSep
				)}' to '${["fixtures", "a", "foo"].join(posixSep)}${posixSep}a'`,
				`      using description file (relative path: .${posixSep}test${posixSep}fixtures${posixSep}yield)`,
				`        using description file (relative path: .${posixSep}test${posixSep}fixtures${posixSep}yield${posixSep}a${posixSep}foo${posixSep}a)`,
				"          no extension",
				`            existing file: ${["fixtures", "a", "foo", "a"].join(
					posixSep
				)}`,
				`              reporting result ${["fixtures", "a", "foo", "a"].join(
					posixSep
				)}`,
				"          .js",
				`            ${["fixtures", "a", "foo", "a.js"].join(
					posixSep
				)} doesn't exist`,
				"          as directory",
				`            ${["fixtures", "a", "foo", "a"].join(
					posixSep
				)} is not a directory`
			];
			let resolver;

			it("default order", done => {
				resolver = createResolver([`${obps}c${obps}foo`, `${obps}a${obps}foo`]);
				run(
					done,
					[false, `${posixSep}a${posixSep}foo${posixSep}a`],
					[
						`resolve 'index${posixSep}a' in 'fixtures'`,
						"  Parsed request is a module",
						`  using description file (relative path: .${posixSep}test${posixSep}fixtures${posixSep}yield)`,
						...cLog,
						...aLog
					]
				);
			});

			it("reverse order", done => {
				resolver = createResolver([`${obps}a${obps}foo`, `${obps}c${obps}foo`]);
				run(
					done,
					[`${posixSep}a${posixSep}foo${posixSep}a`, false],
					[
						`resolve 'index${posixSep}a' in 'fixtures'`,
						"  Parsed request is a module",
						`  using description file (relative path: .${posixSep}test${posixSep}fixtures${posixSep}yield)`,
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

				resolver.resolve(
					{},
					fixtures,
					`index${obps}a`,
					context,
					(err, result) => {
						calls++;
						expect(calls).toEqual(1);
						expect(err).toEqual(null);
						expect(result).toBeUndefined();
						expect(paths).toEqual(makeFixturePaths(expectedResult));
						expect(contextifyDependencies(fileDependencies)).toEqual([
							"",
							`${posixSep}a`,
							`${posixSep}a${posixSep}foo`,
							`${posixSep}a${posixSep}foo${posixSep}a`,
							`${posixSep}c${posixSep}foo${posixSep}package.json`
						]);
						expect(contextifyDependencies(missingDependencies)).toEqual([
							`${posixSep}a${posixSep}foo${posixSep}a`,
							`${posixSep}a${posixSep}foo${posixSep}a.js`,
							`${posixSep}a${posixSep}foo${posixSep}package.json`,
							`${posixSep}a${posixSep}package.json`,
							`${posixSep}c${posixSep}foo${posixSep}a`,
							`${posixSep}c${posixSep}foo${posixSep}a.js`,
							`${posixSep}package.json`
						]);
						expect(Array.from(contextDependencies).sort()).toEqual([]);
						expect(beatifyLogs(logs)).toEqual(expectedLogs);

						done();
					}
				);
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
				const getResult = request => ({ ...request, path: `${posixSep}a` });
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
					expect(err).toBeNull();
					expect(result).toBeUndefined();
					expect(paths).toEqual([`${posixSep}a`]);
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
			it("should return result from cache", done => {
				const cache = {};
				const resolver = ResolverFactory.createResolver({
					extensions: [".js"],
					alias: {
						index: makeFixturePathsForLibrary([
							`${obps}a${obps}foo`,
							`${obps}a${obps}foo-2`
						])
					},
					unsafeCache: cache,
					fileSystem: nodeFileSystem
				});
				resolver.resolve(
					{},
					fixtures,
					`index${obps}b`,
					{ yield: () => {} },
					err => {
						if (err) done(err);
						const paths = [];

						resolver.resolve(
							{},
							fixtures,
							`index${obps}b`,
							{ yield: obj => paths.push(obj.path) },
							(err, result) => {
								expect(err).toBe(null);
								expect(result).toBeUndefined();
								expect(paths).toEqual(
									makeFixturePaths([
										`${obps}a${obps}foo${obps}b`,
										`${obps}a${obps}foo-2${obps}b`
									])
								);
								// original + 2 aliases
								expect(Object.keys(cache)).toHaveLength(3);

								const cacheId = Object.keys(cache).find(id => {
									const { request } = JSON.parse(id);
									return request === `index${posixSep}b`;
								});
								expect(cacheId).not.toBeUndefined();
								expect(Array.isArray(cache[cacheId])).toBe(true);
								expect(cache[cacheId].map(o => o.path)).toEqual(
									makeFixturePaths([
										`${posixSep}a${obps}foo${obps}b`,
										`${posixSep}a${obps}foo-2${obps}b`
									])
								);
								done();
							}
						);
					}
				);
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
							expect(err).toBe(null);
							expect(result).toBeUndefined();
							expect(paths).toEqual([false]);

							// original + 0 aliases
							expect(Object.keys(cache)).toHaveLength(1);

							const cacheId = Object.keys(cache)[0];
							expect(cacheId).not.toBeUndefined();
							expect(Array.isArray(cache[cacheId])).toBe(true);
							expect(cache[cacheId].map(o => o.path)).toEqual([false]);
							done();
						}
					);
				});
			});
		});
	});
});
