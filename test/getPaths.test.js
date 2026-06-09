"use strict";

const assert = require("assert");

const getPaths = require("../lib/getPaths");
const { getPathsCached } = require("../lib/getPaths");
const { describe, it } = require("./_runner");

/**
 * @type {[string, { paths: string[], segments: string[] }][]}
 */
const cases = [
	["/a", { paths: ["/a", "/"], segments: ["a", "/"] }],
	["/a/", { paths: ["/a/", "/a", "/"], segments: ["", "a", "/"] }],
	["/a/b", { paths: ["/a/b", "/a", "/"], segments: ["b", "a", "/"] }],
	[
		"/a/b/",
		{ paths: ["/a/b/", "/a/b", "/a", "/"], segments: ["", "b", "a", "/"] },
	],
	["/", { paths: ["/"], segments: [""] }],
];

describe("get paths", () => {
	for (const case_ of cases) {
		it(case_[0], () => {
			const { paths, segments } = getPaths(case_[0]);
			assert.deepStrictEqual(paths, case_[1].paths);
			assert.deepStrictEqual(segments, case_[1].segments);
		});
	}
});

describe("getPathsCached", () => {
	it("returns identical arrays on cache hit per-fs", () => {
		const fs = /** @type {import("../lib/Resolver").FileSystem} */ ({});
		const a = getPathsCached(fs, "/a/b/c");
		const b = getPathsCached(fs, "/a/b/c");
		// Same cached object — paths/segments arrays are shared.
		assert.strictEqual(a, b);
		assert.strictEqual(a.paths, b.paths);
		assert.strictEqual(a.segments, b.segments);
	});

	it("still returns correct values after cache miss", () => {
		const fs = /** @type {import("../lib/Resolver").FileSystem} */ ({});
		assert.deepStrictEqual(getPathsCached(fs, "/a/b").paths, [
			"/a/b",
			"/a",
			"/",
		]);
		assert.deepStrictEqual(getPathsCached(fs, "/x/y/z").paths, [
			"/x/y/z",
			"/x/y",
			"/x",
			"/",
		]);
	});

	it("handles the root-only input", () => {
		const fs = /** @type {import("../lib/Resolver").FileSystem} */ ({});
		const a = getPathsCached(fs, "/");
		const b = getPathsCached(fs, "/");
		assert.strictEqual(a, b);
		assert.deepStrictEqual(a.paths, ["/"]);
		assert.deepStrictEqual(a.segments, [""]);
	});

	it("keeps caches independent across filesystems", () => {
		const fsA = /** @type {import("../lib/Resolver").FileSystem} */ ({});
		const fsB = /** @type {import("../lib/Resolver").FileSystem} */ ({});
		const first = getPathsCached(fsA, "/p/q");
		const second = getPathsCached(fsB, "/p/q");
		// Values equal but not the same object — separate cache namespaces.
		assert.notStrictEqual(first, second);
		assert.deepStrictEqual(first.paths, second.paths);
	});
});
