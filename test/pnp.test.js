const path = require("path");
const fs = require("fs");
const { ResolverFactory, CachedInputFileSystem } = require("../");
const {
	posixSep,
	transferPathToPosix,
	obps
} = require("./util/path-separator");

const nodeFileSystem = new CachedInputFileSystem(fs, 4000);
const fixture = path.resolve(__dirname, "fixtures", "pnp");

let isAdmin = false;

try {
	fs.symlinkSync("dir", path.resolve(fixture, `pkg${obps}symlink`), "dir");
	isAdmin = true;
} catch (e) {
	// ignore
}
try {
	fs.unlinkSync(path.resolve(fixture, `pkg${obps}symlink`));
} catch (e) {
	isAdmin = false;
	// ignore
}

describe("pnp", () => {
	let pnpApi;
	let resolverFuzzy;
	let resolver;
	if (isAdmin) {
		beforeAll(() => {
			fs.symlinkSync("dir", path.resolve(fixture, `pkg${obps}symlink`), "dir");
		});
		afterAll(() => {
			fs.unlinkSync(path.resolve(fixture, `pkg${obps}symlink`));
		});
	}
	beforeEach(() => {
		pnpApi = /** @type {any} */ ({
			mocks: new Map(),
			ignoredIssuers: new Set(),
			resolveToUnqualified(request, issuer) {
				if (pnpApi.ignoredIssuers.has(issuer)) {
					return null;
				} else if (pnpApi.mocks.has(request)) {
					return pnpApi.mocks.get(request);
				} else {
					const err = /** @type {any} */ (new Error(`No way`));
					err.code = "MODULE_NOT_FOUND";
					err.pnpCode = "UNDECLARED_DEPENDENCY";
					throw err;
				}
			}
		});
		resolverFuzzy = ResolverFactory.createResolver({
			extensions: [".ts", ".js"],
			aliasFields: ["browser"],
			fileSystem: nodeFileSystem,
			alias: {
				alias: path.resolve(fixture, "pkg")
			},
			pnpApi,
			modules: ["node_modules", path.resolve(fixture, `..${obps}pnp-a`)]
		});
		resolver = ResolverFactory.createResolver({
			aliasFields: ["browser"],
			fileSystem: nodeFileSystem,
			fullySpecified: true,
			alias: {
				alias: path.resolve(fixture, "pkg")
			},
			pnpApi,
			modules: [
				"alternative-modules",
				"node_modules",
				path.resolve(fixture, `..${obps}pnp-a`)
			]
		});
	});
	it("should resolve by going through the pnp api", done => {
		// TODO: find a solution how to work with pnp cause it causes some problems
		pnpApi.mocks.set("pkg", path.resolve(fixture, "pkg"));
		resolver.resolve(
			{},
			__dirname,
			`pkg${obps}dir${obps}index.js`,
			{},
			(err, result) => {
				if (err) return done(err);
				expect(result).toEqual(
					transferPathToPosix(
						path.resolve(fixture, `pkg${obps}dir${obps}index.js`)
					)
				);
				done();
			}
		);
	});
	it("should not resolve a not fully specified request when fullySpecified is set", done => {
		pnpApi.mocks.set("pkg", path.resolve(fixture, "pkg"));
		resolver.resolve(
			{},
			__dirname,
			`pkg${obps}dir${obps}index`,
			{},
			(err, result) => {
				expect(err).toBeInstanceOf(Error);
				done();
			}
		);
	});
	it("should track dependency to the pnp api", done => {
		pnpApi.mocks.set("pkg", path.resolve(fixture, "pkg"));
		pnpApi.mocks.set("pnpapi", path.resolve(fixture, ".pnp.js"));
		const fileDependencies = new Set();
		resolver.resolve(
			{},
			__dirname,
			`pkg${obps}dir${obps}index.js`,
			{ fileDependencies },
			(err, result) => {
				if (err) return done(err);
				expect(result).toEqual(
					transferPathToPosix(
						path.resolve(fixture, `pkg${obps}dir${obps}index.js`)
					)
				);
				expect(Array.from(fileDependencies)).toContainEqual(
					transferPathToPosix(path.resolve(fixture, ".pnp.js"))
				);
				done();
			}
		);
	});
	it("should resolve module names with package.json", done => {
		pnpApi.mocks.set("pkg", path.resolve(fixture, "pkg"));
		resolver.resolve({}, __dirname, "pkg", {}, (err, result) => {
			if (err) return done(err);
			expect(result).toEqual(
				transferPathToPosix(path.resolve(fixture, `pkg${obps}main.js`))
			);
			done();
		});
	});
	it("should resolve namespaced module names", done => {
		pnpApi.mocks.set(`@user${posixSep}pkg`, path.resolve(fixture, "pkg"));
		resolver.resolve({}, __dirname, `@user${obps}pkg`, {}, (err, result) => {
			if (err) return done(err);
			expect(result).toEqual(
				transferPathToPosix(path.resolve(fixture, `pkg${obps}main.js`))
			);
			done();
		});
	});
	it(
		"should not resolve symlinks",
		isAdmin
			? done => {
					pnpApi.mocks.set("pkg", path.resolve(fixture, "pkg"));
					resolverFuzzy.resolve(
						{},
						__dirname,
						`pkg${obps}symlink`,
						{},
						(err, result) => {
							if (err) return done(err);
							expect(result).toEqual(
								transferPathToPosix(
									path.resolve(fixture, `pkg${obps}symlink${obps}index.js`)
								)
							);
							done();
						}
					);
			  }
			: () => {}
	);
	it("should properly deal with other extensions", done => {
		pnpApi.mocks.set(`@user${posixSep}pkg`, path.resolve(fixture, "pkg"));
		resolverFuzzy.resolve(
			{},
			__dirname,
			`@user${obps}pkg${obps}typescript`,
			{},
			(err, result) => {
				if (err) return done(err);
				expect(result).toEqual(
					transferPathToPosix(
						path.resolve(fixture, `pkg${obps}typescript${obps}index.ts`)
					)
				);
				done();
			}
		);
	});
	it("should properly deal package.json alias", done => {
		pnpApi.mocks.set("pkg", path.resolve(fixture, "pkg"));
		resolverFuzzy.resolve(
			{},
			__dirname,
			`pkg${obps}package-alias`,
			{},
			(err, result) => {
				if (err) return done(err);
				expect(result).toEqual(
					transferPathToPosix(
						path.resolve(fixture, `pkg${obps}package-alias${obps}browser.js`)
					)
				);
				done();
			}
		);
	});
	it("should prefer pnp resolves over normal modules", done => {
		pnpApi.mocks.set(
			"m1",
			path.resolve(fixture, `..${obps}node_modules${obps}m2`)
		);
		resolver.resolve(
			{},
			path.resolve(__dirname, "fixtures"),
			`m1${obps}b.js`,
			{},
			(err, result) => {
				if (err) return done(err);
				expect(result).toEqual(
					transferPathToPosix(
						path.resolve(fixture, `..${obps}node_modules${obps}m2${obps}b.js`)
					)
				);
				done();
			}
		);
	});
	it("should prefer alternative module directories over pnp", done => {
		pnpApi.mocks.set(
			"m1",
			path.resolve(fixture, `..${obps}node_modules${obps}m2`)
		);
		resolver.resolve(
			{},
			path.resolve(__dirname, `fixtures${obps}prefer-pnp`),
			`m1${obps}b.js`,
			{},
			(err, result) => {
				if (err) return done(err);
				expect(result).toEqual(
					transferPathToPosix(
						path.resolve(
							__dirname,
							`fixtures${obps}prefer-pnp${obps}alternative-modules${obps}m1${obps}b.js`
						)
					)
				);
				done();
			}
		);
	});
	it("should prefer alias over pnp resolves", done => {
		pnpApi.mocks.set("alias", path.resolve(fixture, `pkg${obps}dir`));
		resolver.resolve(
			{},
			path.resolve(__dirname, "fixtures"),
			`alias${obps}index.js`,
			{},
			(err, result) => {
				if (err) return done(err);
				expect(result).toEqual(
					transferPathToPosix(path.resolve(fixture, `pkg${obps}index.js`))
				);
				done();
			}
		);
	});
	it("should prefer pnp over modules after node_modules", done => {
		pnpApi.mocks.set("m2", path.resolve(fixture, "pkg"));
		resolver.resolve(
			{},
			path.resolve(__dirname, "fixtures"),
			`m2${obps}index.js`,
			{},
			(err, result) => {
				if (err) return done(err);
				expect(result).toEqual(
					transferPathToPosix(path.resolve(fixture, `pkg${obps}index.js`))
				);
				done();
			}
		);
	});
	it("should fallback to alternatives when pnp resolving fails", done => {
		resolver.resolve(
			{},
			path.resolve(__dirname, "fixtures"),
			`m2${obps}a.js`,
			{},
			(err, result) => {
				if (err) return done(err);
				expect(result).toEqual(
					transferPathToPosix(
						path.resolve(fixture, `..${obps}pnp-a${obps}m2${obps}a.js`)
					)
				);
				done();
			}
		);
	});
	it("should fallback to alternatives when pnp doesn't manage the issuer", done => {
		pnpApi.ignoredIssuers.add(
			transferPathToPosix(path.resolve(__dirname, "fixtures") + `${posixSep}`)
		);
		// Add the wrong path on purpose to make sure the issuer is ignored
		pnpApi.mocks.set("m2", path.resolve(fixture, "pkg"));
		resolver.resolve(
			{},
			path.resolve(__dirname, "fixtures"),
			`m2${obps}b.js`,
			{},
			(err, result) => {
				if (err) return done(err);
				expect(result).toEqual(
					transferPathToPosix(
						path.resolve(
							__dirname,
							`fixtures${obps}node_modules${obps}m2${obps}b.js`
						)
					)
				);
				done();
			}
		);
	});
	it("should handle the exports field when using PnP", done => {
		pnpApi.mocks.set("m1", path.resolve(fixture, "pkg3"));
		resolver.resolve(
			{},
			path.resolve(__dirname, "fixtures"),
			"m1",
			{},
			(err, result) => {
				if (err) return done(err);
				expect(result).toEqual(
					transferPathToPosix(path.resolve(fixture, `pkg3${obps}a.js`))
				);
				done();
			}
		);
	});
	it("should handle the exports field when using PnP (with sub path)", done => {
		pnpApi.mocks.set(`@user${posixSep}m1`, path.resolve(fixture, "pkg3"));
		resolver.resolve(
			{},
			path.resolve(__dirname, "fixtures"),
			`@user${obps}m1${obps}x`,
			{},
			(err, result) => {
				if (err) return done(err);
				expect(result).toEqual(
					transferPathToPosix(path.resolve(fixture, `pkg3${obps}a.js`))
				);
				done();
			}
		);
	});
});
