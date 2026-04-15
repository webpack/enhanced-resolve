"use strict";

const getPaths = require("../lib/getPaths");

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

describe("getPaths.basename", () => {
	it("returns null when path contains no separators", () => {
		expect(getPaths.basename("foo")).toBeNull();
	});

	it("returns basename after the last forward slash", () => {
		expect(getPaths.basename("/a/b/c")).toBe("c");
	});

	it("returns basename after the last backslash", () => {
		expect(getPaths.basename("a\\b\\c")).toBe("c");
	});

	it("picks the rightmost separator among mixed types", () => {
		expect(getPaths.basename("a/b\\c")).toBe("c");
		expect(getPaths.basename("a\\b/c")).toBe("c");
	});

	it("returns empty string when path ends with a separator", () => {
		expect(getPaths.basename("a/")).toBe("");
		expect(getPaths.basename("a\\")).toBe("");
	});
});
