"use strict";

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const enhancedResolve = require("../lib");
const CachedInputFileSystem = require("../lib/CachedInputFileSystem");
const ResolverFactory = require("../lib/ResolverFactory");

describe("file: URL context and request", () => {
	const fixtures = path.resolve(__dirname, "fixtures");
	const bFile = path.resolve(fixtures, "b.js");
	const fileSystem = new CachedInputFileSystem(fs, 4000);

	const resolver = ResolverFactory.createResolver({
		extensions: [".js"],
		fileSystem,
	});

	describe("context (path) argument", () => {
		it("should accept a URL instance as the context path", (done) => {
			resolver.resolve(
				{},
				pathToFileURL(fixtures),
				"./b.js",
				{},
				(err, result) => {
					if (err) return done(err);
					expect(result).toEqual(bFile);
					done();
				},
			);
		});

		it("should accept a URL context when the context object is omitted", (done) => {
			resolver.resolve(pathToFileURL(fixtures), "./b.js", {}, (err, result) => {
				if (err) return done(err);
				expect(result).toEqual(bFile);
				done();
			});
		});

		it("should still reject a non-string, non-URL context path", (done) => {
			// @ts-expect-error for tests
			resolver.resolve({}, 42, "./b.js", {}, (err) => {
				expect(err).toBeInstanceOf(Error);
				expect(/** @type {Error} */ (err).message).toMatch(
					/path argument is not a string/,
				);
				done();
			});
		});
	});

	describe("request argument", () => {
		it("should accept a file: URL instance as the request", (done) => {
			resolver.resolve(
				{},
				fixtures,
				pathToFileURL(bFile),
				{},
				(err, result) => {
					if (err) return done(err);
					expect(result).toEqual(bFile);
					done();
				},
			);
		});

		it("should still reject a non-string, non-URL request", (done) => {
			// @ts-expect-error for tests
			resolver.resolve({}, fixtures, 42, {}, (err) => {
				expect(err).toBeInstanceOf(Error);
				expect(/** @type {Error} */ (err).message).toMatch(
					/request argument is not a string/,
				);
				done();
			});
		});
	});

	describe("high-level resolve API", () => {
		it("resolve should accept a URL context with the context object omitted", (done) => {
			enhancedResolve(pathToFileURL(fixtures), "./b.js", (err, result) => {
				if (err) return done(err);
				expect(result).toEqual(bFile);
				done();
			});
		});

		it("resolveSync should accept a URL context", () => {
			expect(enhancedResolve.sync(pathToFileURL(fixtures), "./b.js")).toEqual(
				bFile,
			);
		});

		it("resolvePromise should accept a URL context", async () => {
			await expect(
				enhancedResolve.promise(pathToFileURL(fixtures), "./b.js"),
			).resolves.toEqual(bFile);
		});
	});
});
