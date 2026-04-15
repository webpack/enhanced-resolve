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
			new Promise(
				/**
				 * @param {(value: void) => void} res resolve
				 * @param {(reason?: Error) => void} rej reject
				 */
				(res, rej) => {
					resolve(__dirname, "this-module-should-not-exist", (err) => {
						if (err) return rej(err);
						res();
					});
				},
			),
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
			new Promise(
				/**
				 * @param {(value: void) => void} res resolve
				 * @param {(reason?: Error) => void} rej reject
				 */
				(res, rej) => {
					myResolve(__dirname, "this-module-should-not-exist", (err) => {
						if (err) return rej(err);
						res();
					});
				},
			),
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

const fixtures = path.join(__dirname, "fixtures");
const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

describe("resolver argument validation", () => {
	const resolver = ResolverFactory.createResolver({
		fileSystem: nodeFileSystem,
		extensions: [".js"],
	});

	it("reports an error when the context argument is not an object", (done) => {
		resolver.resolve(
			// @ts-expect-error for tests
			"not-an-object",
			fixtures,
			"./a",
			{},
			(err) => {
				expect(err).toBeInstanceOf(Error);
				expect(/** @type {Error} */ (err).message).toMatch(
					"context argument is not an object",
				);
				done();
			},
		);
	});

	it("reports an error when the path argument is not a string", (done) => {
		resolver.resolve(
			{},
			// @ts-expect-error for tests
			123,
			"./a",
			{},
			(err) => {
				expect(err).toBeInstanceOf(Error);
				expect(/** @type {Error} */ (err).message).toMatch(
					"path argument is not a string",
				);
				done();
			},
		);
	});

	it("reports an error when the request argument is not a string", (done) => {
		resolver.resolve(
			{},
			fixtures,
			// @ts-expect-error for tests
			null,
			{},
			(err) => {
				expect(err).toBeInstanceOf(Error);
				expect(/** @type {Error} */ (err).message).toMatch(
					"request argument is not a string",
				);
				done();
			},
		);
	});

	it("reports an error when resolveContext is not provided", (done) => {
		resolver.resolve(
			{},
			fixtures,
			"./a",
			// @ts-expect-error for tests
			null,
			(err) => {
				expect(err).toBeInstanceOf(Error);
				expect(/** @type {Error} */ (err).message).toMatch(
					"resolveContext argument is not set",
				);
				done();
			},
		);
	});

	it("invokes the noResolve hook on resolution failure", (done) => {
		const customResolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			extensions: [".js"],
		});
		const failed = [];
		customResolver.hooks.noResolve.tap("Test", (request, err) => {
			failed.push({ request, err });
		});
		customResolver.resolve({}, fixtures, "./does-not-exist", {}, (err) => {
			expect(err).toBeTruthy();
			expect(failed).toHaveLength(1);
			expect(failed[0].err).toBe(err);
			done();
		});
	});

	it("populates error.details when a resolve fails", (done) => {
		resolver.resolve({}, fixtures, "./does-not-exist", {}, (err) => {
			expect(err).toBeInstanceOf(Error);
			expect(
				/** @type {Error & { details?: string }} */ (err).details,
			).toBeDefined();
			done();
		});
	});

	it("populates error.details when a resolve fails and log is present", (done) => {
		const log = [];
		resolver.resolve(
			{},
			fixtures,
			"./does-not-exist",
			{ log: (m) => log.push(m) },
			(err) => {
				expect(err).toBeInstanceOf(Error);
				expect(
					/** @type {Error & { details?: string }} */ (err).details,
				).toBeDefined();
				expect(log.length).toBeGreaterThan(0);
				done();
			},
		);
	});
});

describe("resolveSync API", () => {
	it("returns a string for a successful sync resolve", () => {
		const syncResolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			extensions: [".js"],
			useSyncFileSystemCalls: true,
		});
		expect(typeof syncResolver.resolveSync({}, fixtures, "./a")).toBe("string");
	});

	it("throws 'Can't resolve' when sync resolve fails", () => {
		const syncResolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			extensions: [".js"],
			useSyncFileSystemCalls: true,
		});
		expect(() =>
			syncResolver.resolveSync({}, fixtures, "./does-not-exist"),
		).toThrow(/Can't resolve/);
	});

	it("throws when resolveSync is used on a non-synchronous filesystem", () => {
		const asyncResolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			extensions: [".js"],
		});
		expect(() => asyncResolver.resolveSync({}, fixtures, "./a")).toThrow(
			"Cannot 'resolveSync' because the fileSystem is not sync. Use 'resolve'!",
		);
	});
});

describe("top-level resolve API", () => {
	it("resolve.sync supports the two-argument form (path, request)", () => {
		expect(typeof resolve.sync(fixtures, "./a.js")).toBe("string");
	});

	it("resolve.create.sync() returns a function that supports the two-argument form", () => {
		const r = resolve.create.sync({});
		expect(typeof r(fixtures, "./a.js")).toBe("string");
	});

	it("exposes plugin classes via lazy getters", () => {
		expect(typeof resolve.CloneBasenamePlugin).toBe("function");
		expect(typeof resolve.LogInfoPlugin).toBe("function");
		expect(typeof resolve.TsconfigPathsPlugin).toBe("function");
		expect(typeof resolve.forEachBail).toBe("function");
		expect(typeof resolve.CachedInputFileSystem).toBe("function");
		expect(resolve.ResolverFactory).toBeDefined();
	});

	it("module.exports is frozen", () => {
		expect(() => {
			// @ts-expect-error frozen
			resolve.somethingNew = 1;
		}).toThrow(/extensible|read only|Cannot add property/);
	});
});

describe("hook helpers", () => {
	const resolver = ResolverFactory.createResolver({
		fileSystem: nodeFileSystem,
		extensions: [".js"],
	});

	it("getHook returns the wrapped hook for 'before*' names", () => {
		const hook = resolver.getHook("beforeResolve");
		expect(typeof hook.tapAsync).toBe("function");
	});

	it("getHook returns the wrapped hook for 'after*' names", () => {
		const hook = resolver.getHook("afterResolve");
		expect(typeof hook.tapAsync).toBe("function");
	});

	it("getHook throws on an unknown hook name", () => {
		expect(() => resolver.getHook("doesNotExist")).toThrow(
			"Hook doesNotExist doesn't exist",
		);
	});

	it("getHook returns the given hook instance as-is", () => {
		const hook = resolver.hooks.resolve;
		expect(resolver.getHook(hook)).toBe(hook);
	});

	it("ensureHook creates a hook when it does not exist", () => {
		const hook = resolver.ensureHook("customCreatedHook");
		expect(typeof hook.tapAsync).toBe("function");
		// Calling again should return the same hook.
		const hook2 = resolver.ensureHook("customCreatedHook");
		expect(hook2).toBe(hook);
	});

	it("ensureHook wraps 'before*' and 'after*' names", () => {
		expect(typeof resolver.ensureHook("beforeAnotherHook").tapAsync).toBe(
			"function",
		);
		expect(typeof resolver.ensureHook("afterAnotherHook").tapAsync).toBe(
			"function",
		);
	});
});

describe("resolver path classifiers", () => {
	const resolver = ResolverFactory.createResolver({
		fileSystem: nodeFileSystem,
	});

	it("isModule recognizes module paths", () => {
		expect(resolver.isModule("foo")).toBe(true);
		expect(resolver.isModule("./foo")).toBe(false);
		expect(resolver.isModule("/foo")).toBe(false);
	});

	it("isPrivate recognizes internal paths", () => {
		expect(resolver.isPrivate("#foo")).toBe(true);
		expect(resolver.isPrivate("./foo")).toBe(false);
	});

	it("isDirectory recognizes paths ending in /", () => {
		expect(resolver.isDirectory("/foo/")).toBe(true);
		expect(resolver.isDirectory("/foo")).toBe(false);
	});

	it("join and normalize delegate to util/path", () => {
		expect(resolver.join("/a", "b")).toBe("/a/b");
		expect(resolver.normalize("/a/./b")).toBe("/a/b");
	});
});
