"use strict";

const fs = require("fs");
const path = require("path");
const resolve = require("../");
const { CachedInputFileSystem, ResolverFactory } = require("../");

describe("simple", () => {
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
		it(`should resolve itself callback ${pathToIt[2]}`, (done) => {
			resolve(pathToIt[0], pathToIt[1], (err, filename) => {
				if (err) {
					return done(
						new Error([err.message, err.stack, err.details].join("\n")),
					);
				}

				expect(filename).toBeDefined();
				expect(filename).toEqual(path.join(__dirname, "..", "lib", "index.js"));
				done();
			});
		});

		it(`should resolve itself callback ${pathToIt[2]} and accept context argument`, (done) => {
			resolve({}, pathToIt[0], pathToIt[1], (err, filename) => {
				if (err) {
					return done(
						new Error([err.message, err.stack, err.details].join("\n")),
					);
				}

				expect(filename).toBeDefined();
				expect(filename).toEqual(path.join(__dirname, "..", "lib", "index.js"));
				done();
			});
		});

		it(`should resolve itself callback ${pathToIt[2]} and accept a resolveContext argument`, (done) => {
			const resolveContext = {};
			resolve({}, pathToIt[0], pathToIt[1], resolveContext, (err, filename) => {
				if (err) {
					return done(
						new Error([err.message, err.stack, err.details].join("\n")),
					);
				}

				expect(filename).toBeDefined();
				expect(filename).toEqual(path.join(__dirname, "..", "lib", "index.js"));
				done();
			});
		});

		it(`should resolve itself sync ${pathToIt[2]}`, () => {
			const filename = resolve.sync(pathToIt[0], pathToIt[1]);

			expect(filename).toBeDefined();
			expect(filename).toEqual(path.join(__dirname, "..", "lib", "index.js"));
		});

		it(`should resolve itself sync ${pathToIt[2]} and accept a context argument`, () => {
			const filename = resolve.sync({}, pathToIt[0], pathToIt[1]);

			expect(filename).toBeDefined();
			expect(filename).toEqual(path.join(__dirname, "..", "lib", "index.js"));
		});

		it(`should resolve itself promise ${pathToIt[2]} and accept a resolveContext argument`, () => {
			const resolveContext = {};
			const filename = resolve.sync(
				{},
				pathToIt[0],
				pathToIt[1],
				resolveContext,
			);

			expect(filename).toEqual(path.join(__dirname, "..", "lib", "index.js"));
		});

		it(`should resolve itself promise ${pathToIt[2]}`, async () => {
			const filename = await resolve.promise(pathToIt[0], pathToIt[1]);

			expect(filename).toBeDefined();
			expect(typeof filename).toBe("string");
			expect(filename).toEqual(path.join(__dirname, "..", "lib", "index.js"));
		});

		it(`should resolve itself promise ${pathToIt[2]} and accept a context argument`, async () => {
			const filename = await resolve.promise({}, pathToIt[0], pathToIt[1]);

			expect(filename).toEqual(path.join(__dirname, "..", "lib", "index.js"));
		});

		it(`should resolve itself promise ${pathToIt[2]} and accept a resolveContext argument`, async () => {
			const resolveContext = {};
			const filename = await resolve.promise(
				{},
				pathToIt[0],
				pathToIt[1],
				resolveContext,
			);

			expect(filename).toEqual(path.join(__dirname, "..", "lib", "index.js"));
		});
	}

	it("should reject on unresolvable requests", async () => {
		await expect(
			new Promise((res, rej) => {
				resolve(__dirname, "this-module-should-not-exist", (err) => {
					if (err) return rej(err);
					res();
				});
			}),
		).rejects.toThrow(/Can't resolve/);
	});

	it("should reject on unresolvable requests sync", () => {
		expect(() =>
			resolve.sync(__dirname, "this-module-should-not-exist"),
		).toThrow(/Can't resolve/);
	});

	it("should reject on unresolvable requests promise", async () => {
		await expect(
			resolve.promise(__dirname, "this-module-should-not-exist"),
		).rejects.toThrow(/Can't resolve/);
	});

	it("should create a async resolver", (done) => {
		const myResolve = resolve.create({
			extensions: [".js", ".json", ".node"],
		});

		myResolve(__dirname, "../lib/index", (err, filename) => {
			if (err) {
				done(err);
				return;
			}

			expect(filename).toEqual(path.join(__dirname, "..", "lib", "index.js"));
			done();
		});
	});

	it("should create a async resolver and accepting context", (done) => {
		const myResolve = resolve.create({
			extensions: [".js", ".json", ".node"],
		});

		myResolve({}, __dirname, "../lib/index", (err, filename) => {
			if (err) {
				done(err);
				return;
			}

			expect(filename).toEqual(path.join(__dirname, "..", "lib", "index.js"));
			done();
		});
	});

	it("should create a async resolver and throw an error on unresolvable request", async () => {
		const myResolve = resolve.create({
			extensions: [".js"],
		});

		await expect(
			new Promise((res, rej) => {
				myResolve(__dirname, "this-module-should-not-exist", (err) => {
					if (err) return rej(err);
					res();
				});
			}),
		).rejects.toThrow(/Can't resolve/);
	});

	it("should create a sync resolver", () => {
		const myResolve = resolve.create.sync({
			extensions: [".js", ".json", ".node"],
		});
		const filename = myResolve(__dirname, "../lib/index");

		expect(filename).toEqual(path.join(__dirname, "..", "lib", "index.js"));
	});

	it("should create a sync resolver and accepting context", () => {
		const myResolve = resolve.create.sync({
			extensions: [".js", ".json", ".node"],
		});
		const filename = myResolve({}, __dirname, "../lib/index");

		expect(filename).toEqual(path.join(__dirname, "..", "lib", "index.js"));
	});

	it("should create a sync resolver and throw an error on unresolvable request", () => {
		const myResolve = resolve.create.sync({
			extensions: [".js"],
		});
		expect(() => myResolve(__dirname, "this-module-should-not-exist")).toThrow(
			/Can't resolve/,
		);
	});

	it("should create a promise resolver", async () => {
		const myResolve = resolve.create.promise({
			extensions: [".js", ".json", ".node"],
		});
		const filename = await myResolve(__dirname, "../lib/index");

		expect(filename).toEqual(path.join(__dirname, "..", "lib", "index.js"));
	});

	it("should create a promise resolver and accepting context", async () => {
		const myResolve = resolve.create.promise({
			extensions: [".js", ".json", ".node"],
		});
		const filename = await myResolve({}, __dirname, "../lib/index");

		expect(filename).toEqual(path.join(__dirname, "..", "lib", "index.js"));
	});

	it("should create a promise resolver and return rejected promise on unresolvable request", async () => {
		const myResolve = resolve.create.promise({
			extensions: [".js"],
		});
		await expect(
			myResolve(__dirname, "this-module-should-not-exist"),
		).rejects.toThrow(/Can't resolve/);
	});

	it("should resolve via the Resolver.resolve method", (done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: new CachedInputFileSystem(fs, 4000),
			extensions: [".js", ".json", ".node"],
		});

		// TODO allow to use `resolve` without `resolveContext`
		resolver.resolve({}, __dirname, "../lib/index", {}, (err, filename) => {
			if (err) {
				done(err);
				return;
			}

			expect(filename).toEqual(path.join(__dirname, "..", "lib", "index.js"));
			done();
		});
	});

	it("should resolve via the Resolver.resolveSync method", () => {
		const resolver = ResolverFactory.createResolver({
			useSyncFileSystemCalls: true,
			fileSystem: new CachedInputFileSystem(fs, 4000),
			extensions: [".js", ".json", ".node"],
		});

		const filename = resolver.resolveSync({}, __dirname, "../lib/index", {});

		expect(filename).toEqual(path.join(__dirname, "..", "lib", "index.js"));
	});

	it("should resolve via the Resolver.resolveSync method without resolve context", () => {
		const resolver = ResolverFactory.createResolver({
			useSyncFileSystemCalls: true,
			fileSystem: new CachedInputFileSystem(fs, 4000),
			extensions: [".js", ".json", ".node"],
		});

		const filename = resolver.resolveSync({}, __dirname, "../lib/index");

		expect(filename).toEqual(path.join(__dirname, "..", "lib", "index.js"));
	});

	it("should resolve via the Resolver.resolvePromise method", async () => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: new CachedInputFileSystem(fs, 4000),
			extensions: [".js", ".json", ".node"],
		});

		const filename = await resolver.resolvePromise(
			{},
			__dirname,
			"../lib/index",
			{},
		);

		expect(filename).toEqual(path.join(__dirname, "..", "lib", "index.js"));
	});

	it("should resolve via the Resolver.resolvePromise method without resolve context", async () => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: new CachedInputFileSystem(fs, 4000),
			extensions: [".js", ".json", ".node"],
		});

		const filename = await resolver.resolvePromise(
			{},
			__dirname,
			"../lib/index",
		);

		expect(filename).toEqual(path.join(__dirname, "..", "lib", "index.js"));
	});
});
