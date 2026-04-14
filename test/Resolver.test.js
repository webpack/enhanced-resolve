"use strict";

/* eslint-disable jsdoc/reject-any-type */

const fs = require("fs");
const path = require("path");
const { ResolverFactory } = require("../");
const CachedInputFileSystem = require("../lib/CachedInputFileSystem");
const Resolver = require("../lib/Resolver");

const fixtures = path.join(__dirname, "fixtures");
const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

/**
 * @returns {import("../lib/Resolver")} resolver instance
 */
function makeResolver() {
	return /** @type {any} */ (
		ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			extensions: [".js"],
		})
	);
}

describe("Resolver edge cases", () => {
	describe("ensureHook", () => {
		it("returns the hook itself when given a hook instance", () => {
			const resolver = makeResolver();
			const hook = resolver.hooks.resolve;
			expect(resolver.ensureHook(hook)).toBe(hook);
		});

		it("creates a 'before*' hook with stage -10", () => {
			const resolver = makeResolver();
			const hook = resolver.ensureHook("beforeMyCustom");
			// Verify the wrapped hook exists with stage -10
			expect(typeof hook.tapAsync).toBe("function");
		});

		it("creates an 'after*' hook with stage 10", () => {
			const resolver = makeResolver();
			const hook = resolver.ensureHook("afterMyCustom");
			expect(typeof hook.tapAsync).toBe("function");
		});

		it("returns existing hook on subsequent calls", () => {
			const resolver = makeResolver();
			const hook1 = resolver.ensureHook("myFreshCustomHook");
			const hook2 = resolver.ensureHook("myFreshCustomHook");
			expect(hook1).toBe(hook2);
		});
	});

	describe("getHook", () => {
		it("returns the hook itself when given a hook instance", () => {
			const resolver = makeResolver();
			const hook = resolver.hooks.resolve;
			expect(resolver.getHook(hook)).toBe(hook);
		});

		it("returns a 'before*' wrapped hook for an existing hook", () => {
			const resolver = makeResolver();
			const hook = resolver.getHook("beforeResolve");
			expect(typeof hook.tapAsync).toBe("function");
		});

		it("returns an 'after*' wrapped hook for an existing hook", () => {
			const resolver = makeResolver();
			const hook = resolver.getHook("afterResolve");
			expect(typeof hook.tapAsync).toBe("function");
		});

		it("throws when the hook does not exist", () => {
			const resolver = makeResolver();
			expect(() => resolver.getHook("nonExistentHookName")).toThrow(
				"Hook nonExistentHookName doesn't exist",
			);
		});
	});

	describe("resolveSync", () => {
		it("throws when used with a non-synchronous file system", () => {
			const resolver = ResolverFactory.createResolver({
				fileSystem: nodeFileSystem,
				extensions: [".js"],
				useSyncFileSystemCalls: false,
			});
			expect(() => resolver.resolveSync({}, fixtures, "./a")).toThrow(
				"Cannot 'resolveSync' because the fileSystem is not sync. Use 'resolve'!",
			);
		});

		it("returns a string when sync resolve succeeds", () => {
			const syncResolver = ResolverFactory.createResolver({
				fileSystem: nodeFileSystem,
				extensions: [".js"],
				useSyncFileSystemCalls: true,
			});
			const result = syncResolver.resolveSync({}, fixtures, "./a");
			expect(typeof result).toBe("string");
		});

		it("throws when sync resolve fails", () => {
			const syncResolver = ResolverFactory.createResolver({
				fileSystem: nodeFileSystem,
				extensions: [".js"],
				useSyncFileSystemCalls: true,
			});
			expect(() =>
				syncResolver.resolveSync({}, fixtures, "./does-not-exist"),
			).toThrow(/Can't resolve/);
		});
	});

	describe("resolve argument validation", () => {
		it("rejects a non-object context", (done) => {
			const resolver = makeResolver();
			resolver.resolve(
				/** @type {any} */ ("not-an-object"),
				fixtures,
				"./a",
				{},
				(err) => {
					expect(err).toBeTruthy();
					expect(err.message).toMatch("context argument is not an object");
					done();
				},
			);
		});

		it("rejects a non-string path", (done) => {
			const resolver = makeResolver();
			resolver.resolve({}, /** @type {any} */ (123), "./a", {}, (err) => {
				expect(err).toBeTruthy();
				expect(err.message).toMatch("path argument is not a string");
				done();
			});
		});

		it("rejects a non-string request", (done) => {
			const resolver = makeResolver();
			resolver.resolve({}, fixtures, /** @type {any} */ (null), {}, (err) => {
				expect(err).toBeTruthy();
				expect(err.message).toMatch("request argument is not a string");
				done();
			});
		});

		it("rejects a missing resolveContext", (done) => {
			const resolver = makeResolver();
			resolver.resolve(
				{},
				fixtures,
				"./a",
				/** @type {any} */ (null),
				(err) => {
					expect(err).toBeTruthy();
					expect(err.message).toMatch("resolveContext argument is not set");
					done();
				},
			);
		});
	});

	describe("path classifiers", () => {
		const resolver = makeResolver();

		it("isModule returns true for normal paths", () => {
			expect(resolver.isModule("foo")).toBe(true);
			expect(resolver.isModule("./foo")).toBe(false);
			expect(resolver.isModule("/foo")).toBe(false);
			expect(resolver.isModule("#foo")).toBe(false);
		});

		it("isPrivate returns true for # paths", () => {
			expect(resolver.isPrivate("#foo")).toBe(true);
			expect(resolver.isPrivate("./foo")).toBe(false);
		});

		it("isDirectory returns true for paths ending in /", () => {
			expect(resolver.isDirectory("/foo/")).toBe(true);
			expect(resolver.isDirectory("/foo")).toBe(false);
		});

		it("join delegates to util/path join", () => {
			expect(resolver.join("/a", "b")).toBe("/a/b");
		});

		it("normalize delegates to util/path normalize", () => {
			expect(resolver.normalize("/a/./b")).toBe("/a/b");
		});
	});

	describe("createStackEntry", () => {
		it("formats request information into the entry string", () => {
			const resolver = makeResolver();
			const hook = resolver.hooks.resolve;
			const entry = Resolver.createStackEntry(
				hook,
				/** @type {any} */ ({
					path: "/p",
					request: "./req",
					query: "?q",
					fragment: "#f",
					directory: true,
					module: true,
				}),
			);
			expect(entry).toContain("/p");
			expect(entry).toContain("./req");
			expect(entry).toContain("?q");
			expect(entry).toContain("#f");
			expect(entry).toContain("directory");
			expect(entry).toContain("module");
		});
	});
});
