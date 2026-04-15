"use strict";

const fs = require("fs");
const path = require("path");
const { CachedInputFileSystem, ResolverFactory } = require("../");
const { dirname, join } = require("../lib/util/path");

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

			expect(resolver1.pathCache).toBe(resolver2.pathCache);
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

			expect(resolver1.pathCache).not.toBe(resolver2.pathCache);
		});

		it("should produce correct results", () => {
			const fileSystem = new CachedInputFileSystem(fs, 0);

			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".js"],
				unsafeCache: true,
			});

			expect(resolver.join("/a/b", "c")).toBe(join("/a/b", "c"));
			expect(resolver.dirname("/a/b/c")).toBe(dirname("/a/b/c"));
			expect(resolver.basename("/a/b/c")).toBe(path.basename("/a/b/c"));
			expect(resolver.basename("/a/b/c.ext", ".ext")).toBe(
				path.basename("/a/b/c.ext", ".ext"),
			);
			expect(resolver.basename("/a/b/c.ext")).toBe(path.basename("/a/b/c.ext"));
			expect(resolver.basename("/a/b/c.ext", ".other")).toBe(
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

			expect(resolver.pathCache.join.cache.size).toBeGreaterThan(0);
			expect(resolver.pathCache.dirname.cache.size).toBeGreaterThan(0);
			expect(resolver.pathCache.basename.cache.size).toBeGreaterThan(0);

			resolver.pathCache.join.cache.clear();
			resolver.pathCache.dirname.cache.clear();
			resolver.pathCache.basename.cache.clear();

			expect(resolver.pathCache.join.cache.size).toBe(0);
			expect(resolver.pathCache.dirname.cache.size).toBe(0);
			expect(resolver.pathCache.basename.cache.size).toBe(0);

			// Still works after clearing
			expect(resolver.join("/a/b", "c")).toBe(join("/a/b", "c"));
			expect(resolver.dirname("/a/b/c")).toBe(dirname("/a/b/c"));
			expect(resolver.basename("/a/b/c")).toBe(path.basename("/a/b/c"));
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

			expect(resolver.pathCache.join.cache.size).toBe(0);
			expect(resolver.pathCache.dirname.cache.size).toBeGreaterThan(0);
			expect(resolver.pathCache.basename.cache.size).toBeGreaterThan(0);
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

			expect(resolver.pathCache.join.cache.size).toBeGreaterThan(0);
			expect(resolver.pathCache.dirname.cache.size).toBe(0);
			expect(resolver.pathCache.basename.cache.size).toBeGreaterThan(0);
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

			expect(resolver.pathCache.join.cache.size).toBeGreaterThan(0);
			expect(resolver.pathCache.dirname.cache.size).toBeGreaterThan(0);
			expect(resolver.pathCache.basename.cache.size).toBe(0);
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

			expect(resolver1.pathCache).toBe(resolver2.pathCache);
		});
	});
});
