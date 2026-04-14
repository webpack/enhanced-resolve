"use strict";

/* eslint-disable jsdoc/reject-any-type */

const fs = require("fs");
const path = require("path");
const { CachedInputFileSystem, ResolverFactory } = require("../");
const resolve = require("../");

const fixtures = path.join(__dirname, "fixtures");
const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

describe("resolver argument validation", () => {
	const resolver = ResolverFactory.createResolver({
		fileSystem: nodeFileSystem,
		extensions: [".js"],
	});

	it("reports an error when the context argument is not an object", (done) => {
		resolver.resolve(
			/** @type {any} */ ("not-an-object"),
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
		resolver.resolve({}, /** @type {any} */ (123), "./a", {}, (err) => {
			expect(err).toBeInstanceOf(Error);
			expect(/** @type {Error} */ (err).message).toMatch(
				"path argument is not a string",
			);
			done();
		});
	});

	it("reports an error when the request argument is not a string", (done) => {
		resolver.resolve({}, fixtures, /** @type {any} */ (null), {}, (err) => {
			expect(err).toBeInstanceOf(Error);
			expect(/** @type {Error} */ (err).message).toMatch(
				"request argument is not a string",
			);
			done();
		});
	});

	it("reports an error when resolveContext is not provided", (done) => {
		resolver.resolve({}, fixtures, "./a", /** @type {any} */ (null), (err) => {
			expect(err).toBeInstanceOf(Error);
			expect(/** @type {Error} */ (err).message).toMatch(
				"resolveContext argument is not set",
			);
			done();
		});
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
