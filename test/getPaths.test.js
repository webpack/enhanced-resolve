"use strict";

const getPaths = require("../lib/getPaths");
const { getPathsCached } = require("../lib/getPaths");

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
			expect(paths).toEqual(case_[1].paths);
			expect(segments).toEqual(case_[1].segments);
		});
	}
});

describe("getPathsCached", () => {
	it("returns identical arrays on cache hit per-fs", () => {
		const fs = /** @type {import("../lib/Resolver").FileSystem} */ ({});
		const a = getPathsCached(fs, "/a/b/c");
		const b = getPathsCached(fs, "/a/b/c");
		// Same cached object — paths/segments arrays are shared.
		expect(a).toBe(b);
		expect(a.paths).toBe(b.paths);
		expect(a.segments).toBe(b.segments);
	});

	it("still returns correct values after cache miss", () => {
		const fs = /** @type {import("../lib/Resolver").FileSystem} */ ({});
		expect(getPathsCached(fs, "/a/b").paths).toEqual(["/a/b", "/a", "/"]);
		expect(getPathsCached(fs, "/x/y/z").paths).toEqual([
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
		expect(a).toBe(b);
		expect(a.paths).toEqual(["/"]);
		expect(a.segments).toEqual([""]);
	});

	it("keeps caches independent across filesystems", () => {
		const fsA = /** @type {import("../lib/Resolver").FileSystem} */ ({});
		const fsB = /** @type {import("../lib/Resolver").FileSystem} */ ({});
		const first = getPathsCached(fsA, "/p/q");
		const second = getPathsCached(fsB, "/p/q");
		// Values equal but not the same object — separate cache namespaces.
		expect(first).not.toBe(second);
		expect(first.paths).toEqual(second.paths);
	});
});
