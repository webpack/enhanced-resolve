"use strict";

const fs = require("fs");
const { CachedInputFileSystem, ResolverFactory } = require("../");
const {
	configure,
	createCachedDirname,
	createCachedJoin,
	dirname,
	join,
} = require("../lib/util/path");

describe("createCachedJoin", () => {
	it("should return the same result as join", () => {
		const cached = createCachedJoin();

		expect(cached("/a/b", "c")).toBe(join("/a/b", "c"));
		expect(cached("/a/b", "../c")).toBe(join("/a/b", "../c"));
		expect(cached("/a/b", "./c/d")).toBe(join("/a/b", "./c/d"));
	});

	it("should return cached result on second call", () => {
		const cached = createCachedJoin();
		const r1 = cached("/a", "b");
		const r2 = cached("/a", "b");

		expect(r1).toBe(r2);
	});

	it("should clear cache when maxSize is exceeded", () => {
		const cached = createCachedJoin(2);

		// Fill cache with 2 root entries
		cached("/root1", "a");
		cached("/root2", "b");
		// This should trigger clear since size >= maxSize
		cached("/root3", "c");
		// /root1 was cleared, calling it again still returns correct result
		expect(cached("/root1", "a")).toBe(join("/root1", "a"));
	});

	it("should not clear when maxSize is 0 (unlimited)", () => {
		const cached = createCachedJoin(0);

		for (let i = 0; i < 100; i++) {
			cached(`/root${i}`, "req");
		}
		// All should still work
		expect(cached("/root0", "req")).toBe(join("/root0", "req"));
		expect(cached("/root99", "req")).toBe(join("/root99", "req"));
	});
});

describe("createCachedDirname", () => {
	it("should return the same result as dirname", () => {
		const cached = createCachedDirname();

		expect(cached("/a/b/c")).toBe(dirname("/a/b/c"));
		expect(cached("/a")).toBe(dirname("/a"));
	});

	it("should return cached result on second call", () => {
		const cached = createCachedDirname();
		const r1 = cached("/a/b/c");
		const r2 = cached("/a/b/c");

		expect(r1).toBe(r2);
	});

	it("should clear cache when maxSize is exceeded", () => {
		const cached = createCachedDirname(2);

		cached("/a/b");
		cached("/c/d");
		// Triggers clear
		cached("/e/f");
		expect(cached("/a/b")).toBe(dirname("/a/b"));
	});
});

describe("configure", () => {
	afterEach(() => {
		// Reset to default
		configure({ maxCacheSize: 0 });
	});

	it("should recreate global caches with new maxCacheSize", () => {
		const pathUtil = require("../lib/util/path");

		const before = pathUtil.cachedJoin;

		configure({ maxCacheSize: 100 });

		const after = pathUtil.cachedJoin;

		// After configure, the getter should return a new function
		expect(before).not.toBe(after);
	});
});

describe("Resolver instance cache", () => {
	it("should have independent join/dirname per instance", () => {
		const fileSystem = new CachedInputFileSystem(fs, 0);

		const resolver1 = ResolverFactory.createResolver({
			fileSystem,
			extensions: [".js"],
		});
		const resolver2 = ResolverFactory.createResolver({
			fileSystem,
			extensions: [".js"],
		});

		expect(resolver1.join).not.toBe(resolver2.join);
		expect(resolver1.dirname).not.toBe(resolver2.dirname);
	});

	it("join and dirname should produce correct results", () => {
		const fileSystem = new CachedInputFileSystem(fs, 0);

		const resolver = ResolverFactory.createResolver({
			fileSystem,
			extensions: [".js"],
		});

		expect(resolver.join("/a/b", "c")).toBe(join("/a/b", "c"));
		expect(resolver.dirname("/a/b/c")).toBe(dirname("/a/b/c"));
	});
});

describe("owner-scoped cache", () => {
	it("should share join/dirname caches across resolvers with same owner", () => {
		const fileSystem = new CachedInputFileSystem(fs, 0);
		const owner = { name: "test-compiler" };

		const resolver1 = ResolverFactory.createResolver({
			fileSystem,
			extensions: [".js"],
			cache: { owner },
		});
		const resolver2 = ResolverFactory.createResolver({
			fileSystem,
			extensions: [".js"],
			cache: { owner },
		});

		expect(resolver1.join).toBe(resolver2.join);
		expect(resolver1.dirname).toBe(resolver2.dirname);
	});

	it("should not share caches across different owners", () => {
		const fileSystem = new CachedInputFileSystem(fs, 0);
		const owner1 = { name: "compiler-1" };
		const owner2 = { name: "compiler-2" };

		const resolver1 = ResolverFactory.createResolver({
			fileSystem,
			extensions: [".js"],
			cache: { owner: owner1 },
		});
		const resolver2 = ResolverFactory.createResolver({
			fileSystem,
			extensions: [".js"],
			cache: { owner: owner2 },
		});

		expect(resolver1.join).not.toBe(resolver2.join);
		expect(resolver1.dirname).not.toBe(resolver2.dirname);
	});

	it("should share unsafeCache across resolvers with same owner", () => {
		const fileSystem = new CachedInputFileSystem(fs, 4000);
		const owner = { name: "test-compiler" };

		const resolver1 = ResolverFactory.createResolver({
			fileSystem,
			extensions: [".js"],
			unsafeCache: true,
			cache: { owner },
		});
		const resolver2 = ResolverFactory.createResolver({
			fileSystem,
			extensions: [".js"],
			unsafeCache: true,
			cache: { owner },
		});

		expect(resolver1.options.unsafeCache).toBe(resolver2.options.unsafeCache);
	});

	it("should not share unsafeCache without owner", () => {
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

		expect(resolver1.options.unsafeCache).not.toBe(
			resolver2.options.unsafeCache,
		);
	});

	it("should respect maxSize with owner", () => {
		const fileSystem = new CachedInputFileSystem(fs, 0);
		const owner = { name: "test-compiler" };

		const resolver = ResolverFactory.createResolver({
			fileSystem,
			extensions: [".js"],
			cache: { owner, maxSize: 2 },
		});

		// Fill cache, then exceed maxSize — should still return correct results
		resolver.join("/root1", "a");
		resolver.join("/root2", "b");
		resolver.join("/root3", "c");

		expect(resolver.join("/root1", "a")).toBe(join("/root1", "a"));
	});
});
