"use strict";

const path = require("path");
const fs = require("fs");
const { ResolverFactory, CachedInputFileSystem } = require("../");

const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

const resolver = ResolverFactory.createResolver({
	extensions: [".ts", ".js"],
	fileSystem: nodeFileSystem,
});

const resolver2 = ResolverFactory.createResolver({
	extensions: [".ts", "", ".js"],
	fileSystem: nodeFileSystem,
});

const resolver3 = ResolverFactory.createResolver({
	extensions: [".ts", "", ".js"],
	enforceExtension: false,
	fileSystem: nodeFileSystem,
});

const fixture = path.resolve(__dirname, "fixtures", "extensions");

describe("extensions", () => {
	it("should resolve according to order of provided extensions", (done) => {
		resolver.resolve({}, fixture, "./foo", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(path.resolve(fixture, "foo.ts"));
			done();
		});
	});

	it("should resolve according to order of provided extensions (dir index)", (done) => {
		resolver.resolve({}, fixture, "./dir", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(path.resolve(fixture, "dir/index.ts"));
			done();
		});
	});

	it("should resolve according to main field in module root", (done) => {
		resolver.resolve({}, fixture, ".", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(path.resolve(fixture, "index.js"));
			done();
		});
	});

	it("should resolve single file module before directory", (done) => {
		resolver.resolve({}, fixture, "module", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(path.resolve(fixture, "node_modules/module.js"));
			done();
		});
	});

	it("should resolve trailing slash directory before single file", (done) => {
		resolver.resolve({}, fixture, "module/", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				path.resolve(fixture, "node_modules/module/index.ts"),
			);
			done();
		});
	});

	it("should not resolve to file when request has a trailing slash (relative)", (done) => {
		resolver.resolve({}, fixture, "./foo.js/", {}, (err, _result) => {
			if (!err) return done(new Error("No error"));
			expect(err).toBeInstanceOf(Error);
			done();
		});
	});

	it("should not resolve to file when request has a trailing slash (module)", (done) => {
		resolver.resolve({}, fixture, "module.js/", {}, (err, _result) => {
			if (!err) return done(new Error("No error"));
			expect(err).toBeInstanceOf(Error);
			done();
		});
	});

	it("should default enforceExtension to true when extensions includes an empty string", (done) => {
		const missingDependencies = new Set();
		resolver2.resolve({}, fixture, "./foo", { missingDependencies }, () => {
			expect(missingDependencies).not.toContain(path.resolve(fixture, "foo"));
			done();
		});
	});

	it("should respect enforceExtension when extensions includes an empty string", (done) => {
		const missingDependencies = new Set();
		resolver3.resolve({}, fixture, "./foo", { missingDependencies }, () => {
			expect(missingDependencies).toContain(path.resolve(fixture, "foo"));
			done();
		});
	});
});
