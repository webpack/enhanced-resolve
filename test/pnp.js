require("should");

const path = require("path");
const fs = require("fs");
const { ResolverFactory, CachedInputFileSystem } = require("../");

/** @typedef {import("../lib/PnpPlugin").PnpApiImpl} PnpApi */

const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

const fixture = path.resolve(__dirname, "fixtures", "pnp");

let isAdmin = false;
try {
	fs.symlinkSync("dir", path.resolve(fixture, "pkg/symlink"), "dir");
	isAdmin = true;
} catch (e) {
	// ignore
}
try {
	fs.unlinkSync(path.resolve(fixture, "pkg/symlink"));
} catch (e) {
	isAdmin = false;
	// ignore
}

describe("pnp", () => {
	let pnpApi;
	let resolverFuzzy;
	let resolver;
	if (isAdmin) {
		before(() => {
			fs.symlinkSync("dir", path.resolve(fixture, "pkg/symlink"), "dir");
		});
		after(() => {
			fs.unlinkSync(path.resolve(fixture, "pkg/symlink"));
		});
	}
	beforeEach(() => {
		pnpApi = /** @type {PnpApi} */ ({
			mocks: new Map(),
			resolveToUnqualified(request, issuer) {
				if (pnpApi.mocks.has(request)) {
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
			modules: ["node_modules", path.resolve(fixture, "../pnp-a")]
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
				path.resolve(fixture, "../pnp-a")
			]
		});
	});
	it("should resolve by going through the pnp api", done => {
		pnpApi.mocks.set("pkg", path.resolve(fixture, "pkg"));
		resolver.resolve({}, __dirname, "pkg/dir/index.js", {}, (err, result) => {
			if (err) return done(err);
			result.should.equal(path.resolve(fixture, "pkg/dir/index.js"));
			done();
		});
	});
	it("should not resolve a not fully specified request when fullySpecified is set", done => {
		pnpApi.mocks.set("pkg", path.resolve(fixture, "pkg"));
		resolver.resolve({}, __dirname, "pkg/dir/index", {}, (err, result) => {
			err.should.be.instanceof(Error);
			done();
		});
	});
	it("should track dependency to the pnp api", done => {
		pnpApi.mocks.set("pkg", path.resolve(fixture, "pkg"));
		pnpApi.mocks.set("pnpapi", path.resolve(fixture, ".pnp.js"));
		const fileDependencies = new Set();
		resolver.resolve(
			{},
			__dirname,
			"pkg/dir/index.js",
			{ fileDependencies },
			(err, result) => {
				if (err) return done(err);
				result.should.equal(path.resolve(fixture, "pkg/dir/index.js"));
				Array.from(fileDependencies).should.containEql(
					path.resolve(fixture, ".pnp.js")
				);
				done();
			}
		);
	});
	it("should resolve module names with package.json", done => {
		pnpApi.mocks.set("pkg", path.resolve(fixture, "pkg"));
		resolver.resolve({}, __dirname, "pkg", {}, (err, result) => {
			if (err) return done(err);
			result.should.equal(path.resolve(fixture, "pkg/main.js"));
			done();
		});
	});
	it("should resolve namespaced module names", done => {
		pnpApi.mocks.set("@user/pkg", path.resolve(fixture, "pkg"));
		resolver.resolve({}, __dirname, "@user/pkg", {}, (err, result) => {
			if (err) return done(err);
			result.should.equal(path.resolve(fixture, "pkg/main.js"));
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
						"pkg/symlink",
						{},
						(err, result) => {
							if (err) return done(err);
							result.should.equal(
								path.resolve(fixture, "pkg/symlink/index.js")
							);
							done();
						}
					);
			  }
			: undefined
	);
	it("should properly deal with other extensions", done => {
		pnpApi.mocks.set("@user/pkg", path.resolve(fixture, "pkg"));
		resolverFuzzy.resolve(
			{},
			__dirname,
			"@user/pkg/typescript",
			{},
			(err, result) => {
				if (err) return done(err);
				result.should.equal(path.resolve(fixture, "pkg/typescript/index.ts"));
				done();
			}
		);
	});
	it("should properly deal package.json alias", done => {
		pnpApi.mocks.set("pkg", path.resolve(fixture, "pkg"));
		resolverFuzzy.resolve(
			{},
			__dirname,
			"pkg/package-alias",
			{},
			(err, result) => {
				if (err) return done(err);
				result.should.equal(
					path.resolve(fixture, "pkg/package-alias/browser.js")
				);
				done();
			}
		);
	});
	it("should prefer pnp resolves over normal modules", done => {
		pnpApi.mocks.set("m1", path.resolve(fixture, "../node_modules/m2"));
		resolver.resolve(
			{},
			path.resolve(__dirname, "fixtures"),
			"m1/b.js",
			{},
			(err, result) => {
				if (err) return done(err);
				result.should.equal(path.resolve(fixture, "../node_modules/m2/b.js"));
				done();
			}
		);
	});
	it("should prefer alternative module directories over pnp", done => {
		pnpApi.mocks.set("m1", path.resolve(fixture, "../node_modules/m2"));
		resolver.resolve(
			{},
			path.resolve(__dirname, "fixtures/prefer-pnp"),
			"m1/b.js",
			{},
			(err, result) => {
				if (err) return done(err);
				result.should.equal(
					path.resolve(
						__dirname,
						"fixtures/prefer-pnp/alternative-modules/m1/b.js"
					)
				);
				done();
			}
		);
	});
	it("should prefer alias over pnp resolves", done => {
		pnpApi.mocks.set("alias", path.resolve(fixture, "pkg/dir"));
		resolver.resolve(
			{},
			path.resolve(__dirname, "fixtures"),
			"alias/index.js",
			{},
			(err, result) => {
				if (err) return done(err);
				result.should.equal(path.resolve(fixture, "pkg/index.js"));
				done();
			}
		);
	});
	it("should prefer pnp over modules after node_modules", done => {
		pnpApi.mocks.set("m2", path.resolve(fixture, "pkg"));
		resolver.resolve(
			{},
			path.resolve(__dirname, "fixtures"),
			"m2/index.js",
			{},
			(err, result) => {
				if (err) return done(err);
				result.should.equal(path.resolve(fixture, "pkg/index.js"));
				done();
			}
		);
	});
	it("should fallback to alternatives when pnp resolving fails", done => {
		resolver.resolve(
			{},
			path.resolve(__dirname, "fixtures"),
			"m2/a.js",
			{},
			(err, result) => {
				if (err) return done(err);
				result.should.equal(path.resolve(fixture, "../pnp-a/m2/a.js"));
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
				result.should.equal(path.resolve(fixture, "pkg3/a.js"));
				done();
			}
		);
	});
	it("should handle the exports field when using PnP (with sub path)", done => {
		pnpApi.mocks.set("@user/m1", path.resolve(fixture, "pkg3"));
		resolver.resolve(
			{},
			path.resolve(__dirname, "fixtures"),
			"@user/m1/x",
			{},
			(err, result) => {
				if (err) return done(err);
				result.should.equal(path.resolve(fixture, "pkg3/a.js"));
				done();
			}
		);
	});
});
