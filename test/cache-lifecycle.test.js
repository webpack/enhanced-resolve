"use strict";

const fs = require("fs");
const {
	Cache,
	CachedInputFileSystem,
	ResolverFactory,
	createCache,
} = require("../");
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

describe("Cache", () => {
	it("should create a Cache instance with default maxSize", () => {
		const cache = createCache();

		expect(cache).toBeInstanceOf(Cache);
		expect(cache.maxSize).toBe(0);
		expect(cache.data).toBeDefined();
	});

	it("should create a Cache instance with custom maxSize", () => {
		const cache = createCache({ maxSize: 5000 });

		expect(cache.maxSize).toBe(5000);
	});

	it("should return the same Cache for the same owner", () => {
		const owner = { name: "compiler" };
		const cache1 = createCache({ owner });
		const cache2 = createCache({ owner });

		expect(cache1).toBe(cache2);
	});

	it("should return different Caches for different owners", () => {
		const owner1 = { name: "compiler-1" };
		const owner2 = { name: "compiler-2" };
		const cache1 = createCache({ owner: owner1 });
		const cache2 = createCache({ owner: owner2 });

		expect(cache1).not.toBe(cache2);
	});

	it("should return a new Cache each time without owner", () => {
		const cache1 = createCache();
		const cache2 = createCache();

		expect(cache1).not.toBe(cache2);
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

	it("should use maxSize from Cache instance", () => {
		const fileSystem = new CachedInputFileSystem(fs, 0);
		const cache = createCache({ maxSize: 2 });

		const resolver = ResolverFactory.createResolver({
			fileSystem,
			extensions: [".js"],
			unsafeCache: cache,
		});

		// Fill and exceed maxSize — should still return correct results
		resolver.join("/root1", "a");
		resolver.join("/root2", "b");
		resolver.join("/root3", "c");

		expect(resolver.join("/root1", "a")).toBe(join("/root1", "a"));
	});
});

describe("unsafeCache with Cache instance", () => {
	it("should share unsafeCache data across resolvers via same Cache", (done) => {
		const fileSystem = new CachedInputFileSystem(fs, 4000);
		const cache = createCache();

		const resolver1 = ResolverFactory.createResolver({
			fileSystem,
			extensions: [".js"],
			unsafeCache: cache,
		});
		const resolver2 = ResolverFactory.createResolver({
			fileSystem,
			extensions: [".js"],
			unsafeCache: cache,
		});

		const fixturePath = require("path").join(__dirname, "fixtures");

		// Resolve with resolver1 to populate cache.data
		resolver1.resolve({}, fixturePath, "m2/b", {}, (err, _result) => {
			if (err) return done(err);
			expect(Object.keys(cache.data).length).toBeGreaterThan(0);

			// Poison cache to verify resolver2 reads from same data
			for (const key of Object.keys(cache.data)) {
				cache.data[key] = { path: "poisoned" };
			}

			resolver2.resolve({}, fixturePath, "m2/b", {}, (err, result) => {
				if (err) return done(err);
				expect(result).toBe("poisoned");
				done();
			});
		});
	});

	it("should not share data between different Cache instances", () => {
		const cache1 = createCache();
		const cache2 = createCache();

		expect(cache1.data).not.toBe(cache2.data);
	});

	it("should share Cache via same owner across resolvers", (done) => {
		const fileSystem = new CachedInputFileSystem(fs, 4000);
		const owner = { name: "compiler" };
		const cache = createCache({ owner });

		const resolver1 = ResolverFactory.createResolver({
			fileSystem,
			extensions: [".js"],
			unsafeCache: cache,
		});

		// Create a second resolver with same owner's cache
		const cache2 = createCache({ owner });

		expect(cache).toBe(cache2);

		const resolver2 = ResolverFactory.createResolver({
			fileSystem,
			extensions: [".js"],
			unsafeCache: cache2,
		});

		const fixturePath = require("path").join(__dirname, "fixtures");

		resolver1.resolve({}, fixturePath, "m2/b", {}, (err, _result) => {
			if (err) return done(err);

			// Poison to verify sharing
			for (const key of Object.keys(cache.data)) {
				cache.data[key] = { path: "owner-shared" };
			}

			resolver2.resolve({}, fixturePath, "m2/b", {}, (err, result) => {
				if (err) return done(err);
				expect(result).toBe("owner-shared");
				done();
			});
		});
	});
});
