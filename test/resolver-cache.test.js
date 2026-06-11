"use strict";

const assert = require("assert");
const fs = require("fs");

const path = require("path");
const { CachedInputFileSystem, ResolverFactory } = require("../");
const { dirname, join } = require("../lib/util/path");
const { describe, it } = require("./_runner");

describe("Resolver join/dirname cache", () => {
	describe("when unsafeCache is enabled", () => {
		it("should share pathCache across resolvers with the same fileSystem", () => {
			const fileSystem = new CachedInputFileSystem(fs, 0);

			const resolver1 = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".js"],
				unsafeCache: true,
			});
			const resolver2 = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".js"],
				unsafeCache: true,
			});

			assert.strictEqual(resolver1.pathCache, resolver2.pathCache);
		});

		it("should use independent caches for different fileSystems", () => {
			const fileSystem1 = new CachedInputFileSystem(fs, 0);
			const fileSystem2 = new CachedInputFileSystem(fs, 0);

			const resolver1 = ResolverFactory.createResolver({
				fileSystem: fileSystem1,
				extensions: [".js"],
				unsafeCache: true,
			});
			const resolver2 = ResolverFactory.createResolver({
				fileSystem: fileSystem2,
				extensions: [".js"],
				unsafeCache: true,
			});

			assert.notStrictEqual(resolver1.pathCache, resolver2.pathCache);
		});

		it("should produce correct results", () => {
			const fileSystem = new CachedInputFileSystem(fs, 0);

			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".js"],
				unsafeCache: true,
			});

			assert.strictEqual(resolver.join("/a/b", "c"), join("/a/b", "c"));
			assert.strictEqual(resolver.dirname("/a/b/c"), dirname("/a/b/c"));
			assert.strictEqual(resolver.basename("/a/b/c"), path.basename("/a/b/c"));
			assert.strictEqual(
				resolver.basename("/a/b/c.ext", ".ext"),
				path.basename("/a/b/c.ext", ".ext"),
			);
			assert.strictEqual(
				resolver.basename("/a/b/c.ext"),
				path.basename("/a/b/c.ext"),
			);
			assert.strictEqual(
				resolver.basename("/a/b/c.ext", ".other"),
				path.basename("/a/b/c.ext", ".other"),
			);
		});

		it("should clear all caches when calling pathCache.clear()", () => {
			const fileSystem = new CachedInputFileSystem(fs, 0);

			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".js"],
				unsafeCache: true,
			});

			resolver.join("/a/b", "c");
			resolver.dirname("/a/b/c");
			resolver.basename("/a/b/c");

			assert.ok(resolver.pathCache.join.cache.size > 0);
			assert.ok(resolver.pathCache.dirname.cache.size > 0);
			assert.ok(resolver.pathCache.basename.cache.size > 0);

			resolver.pathCache.join.cache.clear();
			resolver.pathCache.dirname.cache.clear();
			resolver.pathCache.basename.cache.clear();

			assert.strictEqual(resolver.pathCache.join.cache.size, 0);
			assert.strictEqual(resolver.pathCache.dirname.cache.size, 0);
			assert.strictEqual(resolver.pathCache.basename.cache.size, 0);

			// Still works after clearing
			assert.strictEqual(resolver.join("/a/b", "c"), join("/a/b", "c"));
			assert.strictEqual(resolver.dirname("/a/b/c"), dirname("/a/b/c"));
			assert.strictEqual(resolver.basename("/a/b/c"), path.basename("/a/b/c"));
		});

		it("should clear only join cache when calling pathCache.join.clear()", () => {
			const fileSystem = new CachedInputFileSystem(fs, 0);

			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".js"],
				unsafeCache: true,
			});

			resolver.join("/a/b", "c");
			resolver.dirname("/a/b/c");
			resolver.basename("/a/b/c");

			resolver.pathCache.join.cache.clear();

			assert.strictEqual(resolver.pathCache.join.cache.size, 0);
			assert.ok(resolver.pathCache.dirname.cache.size > 0);
			assert.ok(resolver.pathCache.basename.cache.size > 0);
		});

		it("should clear only dirname cache when calling pathCache.dirname.clear()", () => {
			const fileSystem = new CachedInputFileSystem(fs, 0);

			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".js"],
				unsafeCache: true,
			});

			resolver.join("/a/b", "c");
			resolver.dirname("/a/b/c");
			resolver.basename("/a/b/c");

			resolver.pathCache.dirname.cache.clear();

			assert.ok(resolver.pathCache.join.cache.size > 0);
			assert.strictEqual(resolver.pathCache.dirname.cache.size, 0);
			assert.ok(resolver.pathCache.basename.cache.size > 0);
		});

		it("should clear only dirname cache when calling pathCache.basename.clear()", () => {
			const fileSystem = new CachedInputFileSystem(fs, 0);

			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".js"],
				unsafeCache: true,
			});

			resolver.join("/a/b", "c");
			resolver.dirname("/a/b/c");
			resolver.basename("/a/b/c.ext", ".ext");

			resolver.pathCache.basename.cache.clear();

			assert.ok(resolver.pathCache.join.cache.size > 0);
			assert.ok(resolver.pathCache.dirname.cache.size > 0);
			assert.strictEqual(resolver.pathCache.basename.cache.size, 0);
		});
	});

	describe("when unsafeCache is disabled", () => {
		it("should share pathCache across resolvers with the same fileSystem", () => {
			const fileSystem = new CachedInputFileSystem(fs, 0);

			const resolver1 = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".js"],
			});
			const resolver2 = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".js"],
			});

			assert.strictEqual(resolver1.pathCache, resolver2.pathCache);
		});
	});
});
