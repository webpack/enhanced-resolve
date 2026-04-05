"use strict";

const fs = require("fs");
const { CachedInputFileSystem, ResolverFactory } = require("../");
const { dirname, join } = require("../lib/util/path");

describe("Resolver join/dirname cache", () => {
	describe("when unsafeCache is enabled", () => {
		it("should use cached versions (not the raw functions)", () => {
			const fileSystem = new CachedInputFileSystem(fs, 0);

			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".js"],
				unsafeCache: true,
			});

			expect(resolver.join).not.toBe(join);
			expect(resolver.dirname).not.toBe(dirname);
		});

		it("should share caches across resolvers with the same fileSystem", () => {
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

			expect(resolver1.join).toBe(resolver2.join);
			expect(resolver1.dirname).toBe(resolver2.dirname);
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

			expect(resolver1.join).not.toBe(resolver2.join);
			expect(resolver1.dirname).not.toBe(resolver2.dirname);
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
		});
	});

	describe("when unsafeCache is disabled", () => {
		it("should use the raw uncached functions directly", () => {
			const fileSystem = new CachedInputFileSystem(fs, 0);

			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".js"],
				unsafeCache: false,
			});

			expect(resolver.join).toBe(join);
			expect(resolver.dirname).toBe(dirname);
		});

		it("should share the same function reference across resolvers", () => {
			const fileSystem = new CachedInputFileSystem(fs, 0);

			const resolver1 = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".js"],
			});
			const resolver2 = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".js"],
			});

			expect(resolver1.join).toBe(resolver2.join);
			expect(resolver1.dirname).toBe(resolver2.dirname);
		});
	});
});
