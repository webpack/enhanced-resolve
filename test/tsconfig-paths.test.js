"use strict";

const fs = require("fs");
const path = require("path");
const { ResolverFactory } = require("../");

const exampleDir = path.resolve(__dirname, "fixtures", "tsconfig", "example");
const referenceDir = path.resolve(
	__dirname,
	"fixtures",
	"tsconfig",
	"referenceExample",
);

describe("TsconfigPathsPlugin", () => {
	it("resolves exact mapped path 'foo' via tsconfig option (example)", (done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: fs,
			extensions: [".ts", ".tsx"],
			mainFields: ["browser", "main"],
			mainFiles: ["index"],
			tsconfig: path.join(exampleDir, "tsconfig.json"),
		});

		resolver.resolve({}, exampleDir, "foo", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				path.join(exampleDir, "src", "mapped", "foo", "index.ts"),
			);
			done();
		});
	});

	it("resolves wildcard mapped path 'bar/*' via tsconfig option (example)", (done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: fs,
			extensions: [".ts", ".tsx"],
			mainFields: ["browser", "main"],
			mainFiles: ["index"],
			tsconfig: path.join(exampleDir, "tsconfig.json"),
		});

		resolver.resolve({}, exampleDir, "bar/file1", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				path.join(exampleDir, "src", "mapped", "bar", "file1.ts"),
			);
			done();
		});
	});

	it("falls through when no mapping exists (example)", (done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: fs,
			extensions: [".ts", ".tsx"],
			mainFields: ["browser", "main"],
			mainFiles: ["index"],
			tsconfig: path.join(exampleDir, "tsconfig.json"),
		});

		resolver.resolve({}, exampleDir, "does-not-exist", {}, (err, result) => {
			expect(err).toBeInstanceOf(Error);
			expect(result).toBeUndefined();
			done();
		});
	});

	it("resolves using references from referenceExample project", (done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: fs,
			extensions: [".ts", ".tsx"],
			mainFields: ["browser", "main"],
			mainFiles: ["index"],
			tsconfig: path.join(referenceDir, "tsconfig.json"),
		});

		// 'foo' is mapped in referenceExample to src/mapped/bar (within referenceExample)
		resolver.resolve({}, referenceDir, "foo/file1", {}, (err, resultFoo) => {
			if (err) return done(err);
			if (!resultFoo) return done(new Error("No result for foo"));
			expect(resultFoo).toEqual(
				path.join(referenceDir, "src", "mapped", "bar", "file1.ts"),
			);

			// 'bar/*' maps to src/mapped/foo/* in referenceExample
			resolver.resolve({}, referenceDir, "bar", {}, (err2, resultBar) => {
				if (err2) return done(err2);
				if (!resultBar) return done(new Error("No result for bar/*"));
				expect(resultBar).toEqual(
					path.join(referenceDir, "src", "mapped", "foo", "index.ts"),
				);
				done();
			});
		});
	});
});
