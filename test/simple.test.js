"use strict";

const assert = require("assert");
const fs = require("fs");
const { describe, it } = require("node:test");

const path = require("path");
const resolve = require("../");
const { CachedInputFileSystem, ResolverFactory } = require("../");

const fixtures = path.join(__dirname, "fixtures");

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
		it(`should resolve itself callback ${pathToIt[2]}`, (t, done) => {
			resolve(pathToIt[0], pathToIt[1], (err, filename) => {
				if (err) {
					return done(
						new Error([err.message, err.stack, err.details].join("\n")),
					);
				}

				assert.notStrictEqual(filename, undefined);
				assert.deepStrictEqual(
					filename,
					path.join(__dirname, "..", "lib", "index.js"),
				);
				done();
			});
		});

		it(`should resolve itself callback ${pathToIt[2]} and accept context argument`, (t, done) => {
			resolve({}, pathToIt[0], pathToIt[1], (err, filename) => {
				if (err) {
					return done(
						new Error([err.message, err.stack, err.details].join("\n")),
					);
				}

				assert.notStrictEqual(filename, undefined);
				assert.deepStrictEqual(
					filename,
					path.join(__dirname, "..", "lib", "index.js"),
				);
				done();
			});
		});

		it(`should resolve itself callback ${pathToIt[2]} and accept a resolveContext argument`, (t, done) => {
			const resolveContext = {};
			resolve({}, pathToIt[0], pathToIt[1], resolveContext, (err, filename) => {
				if (err) {
					return done(
						new Error([err.message, err.stack, err.details].join("\n")),
					);
				}

				assert.notStrictEqual(filename, undefined);
				assert.deepStrictEqual(
					filename,
					path.join(__dirname, "..", "lib", "index.js"),
				);
				done();
			});
		});

		it(`should resolve itself sync ${pathToIt[2]}`, () => {
			const filename = resolve.sync(pathToIt[0], pathToIt[1]);

			assert.notStrictEqual(filename, undefined);
			assert.deepStrictEqual(
				filename,
				path.join(__dirname, "..", "lib", "index.js"),
			);
		});

		it(`should resolve itself sync ${pathToIt[2]} and accept a context argument`, () => {
			const filename = resolve.sync({}, pathToIt[0], pathToIt[1]);

			assert.notStrictEqual(filename, undefined);
			assert.deepStrictEqual(
				filename,
				path.join(__dirname, "..", "lib", "index.js"),
			);
		});

		it(`should resolve itself promise ${pathToIt[2]} and accept a resolveContext argument`, () => {
			const resolveContext = {};
			const filename = resolve.sync(
				{},
				pathToIt[0],
				pathToIt[1],
				resolveContext,
			);

			assert.deepStrictEqual(
				filename,
				path.join(__dirname, "..", "lib", "index.js"),
			);
		});

		it(`should resolve itself promise ${pathToIt[2]}`, async () => {
			const filename = await resolve.promise(pathToIt[0], pathToIt[1]);

			assert.notStrictEqual(filename, undefined);
			assert.strictEqual(typeof filename, "string");
			assert.deepStrictEqual(
				filename,
				path.join(__dirname, "..", "lib", "index.js"),
			);
		});

		it(`should resolve itself promise ${pathToIt[2]} and accept a context argument`, async () => {
			const filename = await resolve.promise({}, pathToIt[0], pathToIt[1]);

			assert.deepStrictEqual(
				filename,
				path.join(__dirname, "..", "lib", "index.js"),
			);
		});

		it(`should resolve itself promise ${pathToIt[2]} and accept a resolveContext argument`, async () => {
			const resolveContext = {};
			const filename = await resolve.promise(
				{},
				pathToIt[0],
				pathToIt[1],
				resolveContext,
			);

			assert.deepStrictEqual(
				filename,
				path.join(__dirname, "..", "lib", "index.js"),
			);
		});
	}

	it("should reject on unresolvable requests", async () => {
		await assert.rejects(
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
			/Can't resolve/,
		);
	});

	it("should reject on unresolvable requests sync", () => {
		assert.throws(
			() => resolve.sync(__dirname, "this-module-should-not-exist"),
			/Can't resolve/,
		);
	});

	it("should reject on unresolvable requests promise", async () => {
		await assert.rejects(
			resolve.promise(__dirname, "this-module-should-not-exist"),
			/Can't resolve/,
		);
	});

	it("should create a async resolver", (t, done) => {
		const myResolve = resolve.create({
			extensions: [".js", ".json", ".node"],
		});

		myResolve(__dirname, "../lib/index", (err, filename) => {
			if (err) {
				done(err);
				return;
			}

			assert.deepStrictEqual(
				filename,
				path.join(__dirname, "..", "lib", "index.js"),
			);
			done();
		});
	});

	it("should create a async resolver and accepting context", (t, done) => {
		const myResolve = resolve.create({
			extensions: [".js", ".json", ".node"],
		});

		myResolve({}, __dirname, "../lib/index", (err, filename) => {
			if (err) {
				done(err);
				return;
			}

			assert.deepStrictEqual(
				filename,
				path.join(__dirname, "..", "lib", "index.js"),
			);
			done();
		});
	});

	it("should create a async resolver and throw an error on unresolvable request", async () => {
		const myResolve = resolve.create({
			extensions: [".js"],
		});

		await assert.rejects(
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
			/Can't resolve/,
		);
	});

	it("should create a sync resolver", () => {
		const myResolve = resolve.create.sync({
			extensions: [".js", ".json", ".node"],
		});
		const filename = myResolve(__dirname, "../lib/index");

		assert.deepStrictEqual(
			filename,
			path.join(__dirname, "..", "lib", "index.js"),
		);
	});

	it("should create a sync resolver and accepting context", () => {
		const myResolve = resolve.create.sync({
			extensions: [".js", ".json", ".node"],
		});
		const filename = myResolve({}, __dirname, "../lib/index");

		assert.deepStrictEqual(
			filename,
			path.join(__dirname, "..", "lib", "index.js"),
		);
	});

	it("should create a sync resolver and throw an error on unresolvable request", () => {
		const myResolve = resolve.create.sync({
			extensions: [".js"],
		});
		assert.throws(
			() => myResolve(__dirname, "this-module-should-not-exist"),
			/Can't resolve/,
		);
	});

	it("should create a promise resolver", async () => {
		const myResolve = resolve.create.promise({
			extensions: [".js", ".json", ".node"],
		});
		const filename = await myResolve(__dirname, "../lib/index");

		assert.deepStrictEqual(
			filename,
			path.join(__dirname, "..", "lib", "index.js"),
		);
	});

	it("should create a promise resolver and accepting context", async () => {
		const myResolve = resolve.create.promise({
			extensions: [".js", ".json", ".node"],
		});
		const filename = await myResolve({}, __dirname, "../lib/index");

		assert.deepStrictEqual(
			filename,
			path.join(__dirname, "..", "lib", "index.js"),
		);
	});

	it("should create a promise resolver and return rejected promise on unresolvable request", async () => {
		const myResolve = resolve.create.promise({
			extensions: [".js"],
		});
		await assert.rejects(
			myResolve(__dirname, "this-module-should-not-exist"),
			/Can't resolve/,
		);
	});

	it("should resolve via the Resolver.resolve method", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: new CachedInputFileSystem(fs, 4000),
			extensions: [".js", ".json", ".node"],
		});

		resolver.resolve(__dirname, "../lib/index", (err, filename) => {
			if (err) {
				done(err);
				return;
			}

			assert.deepStrictEqual(
				filename,
				path.join(__dirname, "..", "lib", "index.js"),
			);
			done();
		});
	});

	it("should resolve via the Resolver.resolve method with resolve context", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: new CachedInputFileSystem(fs, 4000),
			extensions: [".js", ".json", ".node"],
		});

		resolver.resolve(__dirname, "../lib/index", {}, (err, filename) => {
			if (err) {
				done(err);
				return;
			}

			assert.deepStrictEqual(
				filename,
				path.join(__dirname, "..", "lib", "index.js"),
			);
			done();
		});
	});

	it("should resolve via the Resolver.resolve method with context", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: new CachedInputFileSystem(fs, 4000),
			extensions: [".js", ".json", ".node"],
		});

		resolver.resolve({}, __dirname, "../lib/index", (err, filename) => {
			if (err) {
				done(err);
				return;
			}

			assert.deepStrictEqual(
				filename,
				path.join(__dirname, "..", "lib", "index.js"),
			);
			done();
		});
	});

	it("should resolve via the Resolver.resolve method with context and resolve context", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: new CachedInputFileSystem(fs, 4000),
			extensions: [".js", ".json", ".node"],
		});

		resolver.resolve({}, __dirname, "../lib/index", {}, (err, filename) => {
			if (err) {
				done(err);
				return;
			}

			assert.deepStrictEqual(
				filename,
				path.join(__dirname, "..", "lib", "index.js"),
			);
			done();
		});
	});

	it("should resolve via the Resolver.resolveSync method", () => {
		const resolver = ResolverFactory.createResolver({
			useSyncFileSystemCalls: true,
			fileSystem: new CachedInputFileSystem(fs, 4000),
			extensions: [".js", ".json", ".node"],
		});

		const filename = resolver.resolveSync(__dirname, "../lib/index");

		assert.deepStrictEqual(
			filename,
			path.join(__dirname, "..", "lib", "index.js"),
		);
	});

	it("should resolve via the Resolver.resolveSync method with resolve context", () => {
		const resolver = ResolverFactory.createResolver({
			useSyncFileSystemCalls: true,
			fileSystem: new CachedInputFileSystem(fs, 4000),
			extensions: [".js", ".json", ".node"],
		});

		const filename = resolver.resolveSync(__dirname, "../lib/index", {});

		assert.deepStrictEqual(
			filename,
			path.join(__dirname, "..", "lib", "index.js"),
		);
	});

	it("should resolve via the Resolver.resolveSync method with context", () => {
		const resolver = ResolverFactory.createResolver({
			useSyncFileSystemCalls: true,
			fileSystem: new CachedInputFileSystem(fs, 4000),
			extensions: [".js", ".json", ".node"],
		});

		const filename = resolver.resolveSync({}, __dirname, "../lib/index");

		assert.deepStrictEqual(
			filename,
			path.join(__dirname, "..", "lib", "index.js"),
		);
	});

	it("should resolve via the Resolver.resolveSync method with context and resolve context", () => {
		const resolver = ResolverFactory.createResolver({
			useSyncFileSystemCalls: true,
			fileSystem: new CachedInputFileSystem(fs, 4000),
			extensions: [".js", ".json", ".node"],
		});

		const filename = resolver.resolveSync({}, __dirname, "../lib/index", {});

		assert.deepStrictEqual(
			filename,
			path.join(__dirname, "..", "lib", "index.js"),
		);
	});

	it("should resolve via the Resolver.resolvePromise method", async () => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: new CachedInputFileSystem(fs, 4000),
			extensions: [".js", ".json", ".node"],
		});

		const filename = await resolver.resolvePromise(__dirname, "../lib/index");

		assert.deepStrictEqual(
			filename,
			path.join(__dirname, "..", "lib", "index.js"),
		);
	});

	it("should resolve via the Resolver.resolvePromise method with resolve context", async () => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: new CachedInputFileSystem(fs, 4000),
			extensions: [".js", ".json", ".node"],
		});

		const filename = await resolver.resolvePromise(
			__dirname,
			"../lib/index",
			{},
		);

		assert.deepStrictEqual(
			filename,
			path.join(__dirname, "..", "lib", "index.js"),
		);
	});

	it("should resolve via the Resolver.resolvePromise method with context", async () => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: new CachedInputFileSystem(fs, 4000),
			extensions: [".js", ".json", ".node"],
		});

		const filename = await resolver.resolvePromise(
			{},
			__dirname,
			"../lib/index",
		);

		assert.deepStrictEqual(
			filename,
			path.join(__dirname, "..", "lib", "index.js"),
		);
	});

	it("should resolve via the Resolver.resolvePromise method with context and resolve context", async () => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: new CachedInputFileSystem(fs, 4000),
			extensions: [".js", ".json", ".node"],
		});

		const filename = await resolver.resolvePromise(
			{},
			__dirname,
			"../lib/index",
		);

		assert.deepStrictEqual(
			filename,
			path.join(__dirname, "..", "lib", "index.js"),
		);
	});

	describe("API", () => {
		const nodeFileSystem = new CachedInputFileSystem(fs, 4000);
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			extensions: [".js"],
		});

		it("getHook returns the wrapped hook for 'before*' names", () => {
			const hook = resolver.getHook("beforeResolve");
			assert.strictEqual(typeof hook.tapAsync, "function");
		});

		it("getHook returns the wrapped hook for 'after*' names", () => {
			const hook = resolver.getHook("afterResolve");
			assert.strictEqual(typeof hook.tapAsync, "function");
		});

		it("getHook throws on an unknown hook name", () => {
			assert.throws(
				() => resolver.getHook("doesNotExist"),
				(err) =>
					err instanceof Error &&
					err.message.includes("Hook doesNotExist doesn't exist"),
			);
		});

		it("getHook returns the given hook instance as-is", () => {
			const hook = resolver.hooks.resolve;
			assert.strictEqual(resolver.getHook(hook), hook);
		});

		it("ensureHook creates a hook when it does not exist", () => {
			const hook = resolver.ensureHook("customCreatedHook");
			assert.strictEqual(typeof hook.tapAsync, "function");
			// Calling again should return the same hook.
			const hook2 = resolver.ensureHook("customCreatedHook");
			assert.strictEqual(hook2, hook);
		});

		it("ensureHook wraps 'before*' and 'after*' names", () => {
			assert.strictEqual(
				typeof resolver.ensureHook("beforeAnotherHook").tapAsync,
				"function",
			);
			assert.strictEqual(
				typeof resolver.ensureHook("afterAnotherHook").tapAsync,
				"function",
			);
		});

		it("isModule recognizes module paths", () => {
			assert.strictEqual(resolver.isModule("foo"), true);
			assert.strictEqual(resolver.isModule("./foo"), false);
			assert.strictEqual(resolver.isModule("/foo"), false);
		});

		it("isPrivate recognizes internal paths", () => {
			assert.strictEqual(resolver.isPrivate("#foo"), true);
			assert.strictEqual(resolver.isPrivate("./foo"), false);
		});

		it("isDirectory recognizes paths ending in /", () => {
			assert.strictEqual(resolver.isDirectory("/foo/"), true);
			assert.strictEqual(resolver.isDirectory("/foo"), false);
		});

		it("join and normalize delegate to util/path", () => {
			assert.strictEqual(resolver.join("/a", "b"), "/a/b");
			assert.strictEqual(resolver.normalize("/a/./b"), "/a/b");
		});

		it("throws when resolveSync is used on a non-synchronous filesystem", () => {
			const asyncResolver = ResolverFactory.createResolver({
				fileSystem: nodeFileSystem,
				extensions: [".js"],
			});
			assert.throws(
				() => asyncResolver.resolveSync({}, fixtures, "./a"),
				(err) =>
					err instanceof Error &&
					err.message.includes(
						"Cannot 'resolveSync' because the fileSystem is not sync. Use 'resolve'!",
					),
			);
		});

		it("resolves when context is omitted", (t, done) => {
			resolver.resolve(fixtures, "./a", (err, result) => {
				if (err) return done(err);
				assert.strictEqual(typeof result, "string");
				done();
			});
		});

		it("resolves when context is omitted (with resolveContext)", (t, done) => {
			resolver.resolve(fixtures, "./a", {}, (err, result) => {
				if (err) return done(err);
				assert.strictEqual(typeof result, "string");
				done();
			});
		});

		it("reports an error when the path argument is not a string", (t, done) => {
			resolver.resolve(
				{},
				// @ts-expect-error for tests
				123,
				"./a",
				{},
				(err) => {
					assert.ok(err instanceof Error);
					assert.ok(err.message.includes("path argument is not a string"));
					done();
				},
			);
		});

		it("reports an error when the request argument is not a string", (t, done) => {
			resolver.resolve(
				{},
				fixtures,
				// @ts-expect-error for tests
				null,
				{},
				(err) => {
					assert.ok(err instanceof Error);
					assert.ok(err.message.includes("request argument is not a string"));
					done();
				},
			);
		});

		it("resolves when resolveContext is omitted", (t, done) => {
			resolver.resolve({}, fixtures, "./a", (err, result) => {
				if (err) return done(err);
				assert.strictEqual(typeof result, "string");
				done();
			});
		});

		it("resolves when resolveContext is null", (t, done) => {
			resolver.resolve(
				{},
				fixtures,
				"./a",
				// @ts-expect-error for tests
				null,
				(err, result) => {
					if (err) return done(err);
					assert.strictEqual(typeof result, "string");
					done();
				},
			);
		});

		it("throws when callback is not a function", () => {
			assert.throws(
				() => {
					// @ts-expect-error for tests
					resolver.resolve({}, fixtures, "./a", {});
				},
				(err) =>
					err instanceof Error &&
					err.message.includes("callback argument is not a function"),
			);
		});

		it("invokes the noResolve hook on resolution failure", (t, done) => {
			const customResolver = ResolverFactory.createResolver({
				fileSystem: nodeFileSystem,
				extensions: [".js"],
			});
			const failed = [];
			customResolver.hooks.noResolve.tap("Test", (request, err) => {
				failed.push({ request, err });
			});
			customResolver.resolve({}, fixtures, "./does-not-exist", {}, (err) => {
				assert.ok(err);
				assert.strictEqual(failed.length, 1);
				assert.strictEqual(failed[0].err, err);
				done();
			});
		});

		it("populates error.details when a resolve fails", (t, done) => {
			resolver.resolve({}, fixtures, "./does-not-exist", {}, (err) => {
				assert.ok(err instanceof Error);
				assert.notStrictEqual(
					/** @type {Error & { details?: string }} */ (err).details,
					undefined,
				);
				done();
			});
		});

		it("populates error.details when a resolve fails and log is present", (t, done) => {
			const log = [];
			resolver.resolve(
				{},
				fixtures,
				"./does-not-exist",
				{ log: (m) => log.push(m) },
				(err) => {
					assert.ok(err instanceof Error);
					assert.notStrictEqual(
						/** @type {Error & { details?: string }} */ (err).details,
						undefined,
					);
					assert.ok(log.length > 0);
					done();
				},
			);
		});
	});
});
