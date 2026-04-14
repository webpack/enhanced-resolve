"use strict";

const fs = require("fs");
const path = require("path");
const resolve = require("../");
const { CachedInputFileSystem, ResolverFactory } = require("../");

describe("promise api", () => {
	const pathsToIt = [
		[__dirname, "../lib/index", "direct"],
		[__dirname, "..", "as directory"],
		[path.join(__dirname, "..", ".."), "./enhanced-resolve", "as module"],
		[
			path.join(__dirname, "..", ".."),
			"./enhanced-resolve/lib/index",
			"in module",
		],
	];

	for (const pathToIt of pathsToIt) {
		it(`should resolve itself ${pathToIt[2]} via promise`, async () => {
			const filename = await resolve.promise(pathToIt[0], pathToIt[1]);

			expect(filename).toBeDefined();
			expect(typeof filename).toBe("string");
			expect(filename).toEqual(path.join(__dirname, "..", "lib", "index.js"));
		});
	}

	it("should resolve without a context argument", async () => {
		const filename = await resolve.promise(__dirname, "../lib/index");

		expect(filename).toEqual(path.join(__dirname, "..", "lib", "index.js"));
	});

	it("should accept a context argument", async () => {
		const filename = await resolve.promise({}, __dirname, "../lib/index");

		expect(filename).toEqual(path.join(__dirname, "..", "lib", "index.js"));
	});

	it("should accept a resolveContext argument", async () => {
		const resolveContext = {};
		const filename = await resolve.promise(
			{},
			__dirname,
			"../lib/index",
			resolveContext,
		);

		expect(filename).toEqual(path.join(__dirname, "..", "lib", "index.js"));
	});

	it("should reject on unresolvable requests", async () => {
		await expect(
			resolve.promise(__dirname, "this-module-should-not-exist"),
		).rejects.toThrow(/Can't resolve/);
	});

	it("should return the same promise instance type", () => {
		const p = resolve.promise(__dirname, "../lib/index");

		expect(p).toBeInstanceOf(Promise);

		return p;
	});

	describe("resolve.create.promise", () => {
		it("should create a promise resolver", async () => {
			const myResolve = resolve.create.promise({
				extensions: [".js", ".json", ".node"],
			});
			const filename = await myResolve(__dirname, "../lib/index");

			expect(filename).toEqual(path.join(__dirname, "..", "lib", "index.js"));
		});

		it("should create a promise resolver accepting a context", async () => {
			const myResolve = resolve.create.promise({
				extensions: [".js", ".json", ".node"],
			});
			const filename = await myResolve({}, __dirname, "../lib/index");

			expect(filename).toEqual(path.join(__dirname, "..", "lib", "index.js"));
		});

		it("should return rejected promise on unresolvable request", async () => {
			const myResolve = resolve.create.promise({
				extensions: [".js"],
			});
			await expect(
				myResolve(__dirname, "this-module-should-not-exist"),
			).rejects.toThrow(/Can't resolve/);
		});
	});

	describe("Resolver.resolvePromise", () => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: new CachedInputFileSystem(fs, 4000),
			extensions: [".js", ".json", ".node"],
		});

		it("should resolve via the Resolver.resolvePromise method", async () => {
			const filename = await resolver.resolvePromise(
				{},
				__dirname,
				"../lib/index",
				{},
			);

			expect(filename).toEqual(path.join(__dirname, "..", "lib", "index.js"));
		});

		it("should allow omitting resolveContext", async () => {
			const filename = await resolver.resolvePromise(
				{},
				__dirname,
				"../lib/index",
			);

			expect(filename).toEqual(path.join(__dirname, "..", "lib", "index.js"));
		});

		it("should reject on unresolvable requests", async () => {
			await expect(
				resolver.resolvePromise({}, __dirname, "this-module-should-not-exist"),
			).rejects.toThrow(/Can't resolve/);
		});
	});
});
