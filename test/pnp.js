const path = require("path");
const fs = require("fs");
require("should");
const ResolverFactory = require("../lib/ResolverFactory");
const CachedInputFileSystem = require("../lib/CachedInputFileSystem");

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
		pnpApi = {
			mocks: new Map(),
			resolveToUnqualified(request, issuer) {
				if (pnpApi.mocks.has(request)) {
					return pnpApi.mocks.get(request);
				} else {
					throw new Error(`No way`);
				}
			}
		};
		resolver = ResolverFactory.createResolver({
			extensions: [".ts", ".js"],
			aliasFields: ["browser"],
			fileSystem: nodeFileSystem,
			pnpApi
		});
	});
	it("should resolve by going through the pnp api", done => {
		pnpApi.mocks.set(
			"pkg/dir/index.js",
			path.resolve(fixture, "pkg/dir/index.js")
		);
		resolver.resolve({}, __dirname, "pkg/dir/index.js", {}, (err, result) => {
			if (err) return done(err);
			result.should.equal(path.resolve(fixture, "pkg/dir/index.js"));
			done();
		});
	});
	it("should track dependency to the pnp api", done => {
		pnpApi.mocks.set(
			"pkg/dir/index.js",
			path.resolve(fixture, "pkg/dir/index.js")
		);
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
					pnpApi.mocks.set("pkg/symlink", path.resolve(fixture, "pkg/symlink"));
					resolver.resolve({}, __dirname, "pkg/symlink", {}, (err, result) => {
						if (err) return done(err);
						result.should.equal(path.resolve(fixture, "pkg/symlink/index.js"));
						done();
					});
			  }
			: undefined
	);
	it("should properly deal with other extensions", done => {
		pnpApi.mocks.set(
			"@user/pkg/typescript",
			path.resolve(fixture, "pkg/typescript")
		);
		resolver.resolve(
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
		pnpApi.mocks.set(
			"pkg/package-alias",
			path.resolve(fixture, "pkg/package-alias")
		);
		resolver.resolve({}, __dirname, "pkg/package-alias", {}, (err, result) => {
			if (err) return done(err);
			result.should.equal(
				path.resolve(fixture, "pkg/package-alias/browser.js")
			);
			done();
		});
	});
	it("should skip normal modules when pnp resolves", done => {
		pnpApi.mocks.set("m1/a.js", path.resolve(fixture, "pkg/a.js"));
		resolver.resolve(
			{},
			path.resolve(__dirname, "fixtures"),
			"m1/a.js",
			{},
			(err, result) => {
				if (!err) return done(new Error("Resolving should fail"));
				done();
			}
		);
	});
});
