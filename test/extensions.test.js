const path = require("path");
const fs = require("fs");
const { ResolverFactory, CachedInputFileSystem } = require("../");
const { transferPathToPosix, obps } = require("./util/path-separator");

const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

const resolver = ResolverFactory.createResolver({
	extensions: [".ts", ".js"],
	fileSystem: nodeFileSystem
});

const resolver2 = ResolverFactory.createResolver({
	extensions: [".ts", "", ".js"],
	fileSystem: nodeFileSystem
});

const resolver3 = ResolverFactory.createResolver({
	extensions: [".ts", "", ".js"],
	enforceExtension: false,
	fileSystem: nodeFileSystem
});

const fixture = path.resolve(__dirname, "fixtures", "extensions");

describe("extensions", function () {
	it("should resolve according to order of provided extensions", function (done) {
		resolver.resolve({}, fixture, `.${obps}foo`, {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				transferPathToPosix(path.resolve(fixture, "foo.ts"))
			);
			done();
		});
	});
	it("should resolve according to order of provided extensions (dir index)", function (done) {
		resolver.resolve({}, fixture, `.${obps}dir`, {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				transferPathToPosix(path.resolve(fixture, `dir${obps}index.ts`))
			);
			done();
		});
	});
	it("should resolve according to main field in module root", function (done) {
		resolver.resolve({}, fixture, ".", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				transferPathToPosix(path.resolve(fixture, "index.js"))
			);
			done();
		});
	});
	it("should resolve single file module before directory", function (done) {
		resolver.resolve({}, fixture, "module", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				transferPathToPosix(
					path.resolve(fixture, `node_modules${obps}module.js`)
				)
			);
			done();
		});
	});
	it("should resolve trailing slash directory before single file", function (done) {
		resolver.resolve({}, fixture, `module${obps}`, {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				transferPathToPosix(
					path.resolve(fixture, `node_modules${obps}module${obps}index.ts`)
				)
			);
			done();
		});
	});
	it("should not resolve to file when request has a trailing slash (relative)", function (done) {
		resolver.resolve(
			{},
			fixture,
			`.${obps}foo.js${obps}`,
			{},
			(err, result) => {
				if (!err) return done(new Error("No error"));
				expect(err).toBeInstanceOf(Error);
				done();
			}
		);
	});
	it("should not resolve to file when request has a trailing slash (module)", function (done) {
		resolver.resolve({}, fixture, `module.js${obps}`, {}, (err, result) => {
			if (!err) return done(new Error("No error"));
			expect(err).toBeInstanceOf(Error);
			done();
		});
	});
	it("should default enforceExtension to true when extensions includes an empty string", function (done) {
		const missingDependencies = new Set();
		resolver2.resolve(
			{},
			fixture,
			`.${obps}foo`,
			{ missingDependencies },
			() => {
				expect(missingDependencies).not.toContain(
					transferPathToPosix(path.resolve(fixture, "foo"))
				);
				done();
			}
		);
	});
	it("should respect enforceExtension when extensions includes an empty string", function (done) {
		const missingDependencies = new Set();
		resolver3.resolve(
			{},
			fixture,
			`.${obps}foo`,
			{ missingDependencies },
			() => {
				expect(missingDependencies).toContain(
					transferPathToPosix(path.resolve(fixture, "foo"))
				);
				done();
			}
		);
	});
});
