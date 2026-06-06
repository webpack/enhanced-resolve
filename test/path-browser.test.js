"use strict";

const nodePath = require("path");
const pathBrowser = require("../lib/util/path-browser");

// The browser shim must behave exactly like Node's `path` for the subset the
// resolver relies on. Parity is asserted directly against Node's real module.
describe("path-browser shim", () => {
	const posixCases = [
		"",
		".",
		"..",
		"/",
		"//",
		"///",
		"/foo/bar",
		"/foo/bar/",
		"foo/bar",
		"foo/./bar",
		"foo/../bar",
		"foo/bar/..",
		"../../foo",
		"/foo/../../bar",
		"/a//b////c/d/../e",
		"./foo/bar/",
		"foo/bar/baz.js",
		"a/b/c/../../../../d",
		"/..",
		"/../..",
		"./",
		"../",
		"...",
		"/...//",
		".hidden/file",
		"a/b/./././c",
		"/a/b/c/../../..",
		"/a/b/c/../../../..",
		"node_modules/pkg/index.js",
	];

	const win32Cases = [
		"",
		".",
		"\\",
		"\\\\",
		"C:\\foo\\bar",
		"C:\\foo\\..\\bar",
		"C:/foo/bar",
		"c:\\a\\b\\..\\c",
		"\\foo\\bar",
		"\\\\server\\share\\file",
		"\\\\server\\share\\dir\\..\\file",
		"\\\\server\\share",
		"\\\\server\\share\\",
		"C:foo\\bar",
		"C:",
		"C:.",
		"C:..\\foo",
		"C:\\foo\\bar\\",
		"foo\\bar\\..\\baz",
		"foo/bar\\baz",
		"C:\\a\\b\\..\\..\\..\\c",
		"\\\\server\\share\\a\\..\\..\\b",
		"C:\\\\\\foo",
		"\\\\?\\C:\\foo",
		"\\\\?\\C:\\foo\\bar",
	];

	// DOS device paths and the CVE-2024-36139 colon-segment guard are Node 22+
	// behaviors, so they're pinned to literal expected values (computed from
	// Node 22) rather than compared to the runtime's `path`, which may be older
	// (e.g. bun lacks the `.\\` colon guard).
	const win32Pinned = [
		["\\\\.\\", "\\"],
		["\\\\?\\", "\\?\\"],
		["\\\\.\\pipe\\a\\..\\b", "\\\\.\\pipe\\b"],
		["\\\\?\\C:\\foo\\..\\bar", "\\\\?\\C:\\bar"],
		["\\\\?\\C:\\foo\\", "\\\\?\\C:\\foo\\"],
		[
			"\\\\?\\UNC\\server\\share\\dir\\..\\file",
			"\\\\?\\UNC\\server\\share\\file",
		],
		["a/C:", ".\\a\\C:"],
		["../C:", ".\\..\\C:"],
		["foo\\bar:baz", "foo\\bar:baz"],
	];

	describe("posix.normalize", () => {
		for (const input of posixCases) {
			it(`matches Node for ${JSON.stringify(input)}`, () => {
				expect(pathBrowser.posix.normalize(input)).toBe(
					nodePath.posix.normalize(input),
				);
			});
		}
	});

	describe("win32.normalize", () => {
		for (const input of win32Cases) {
			it(`matches Node for ${JSON.stringify(input)}`, () => {
				expect(pathBrowser.win32.normalize(input)).toBe(
					nodePath.win32.normalize(input),
				);
			});
		}
	});

	describe("win32.normalize device paths and colon guard (pinned to Node 22)", () => {
		for (const [input, expected] of win32Pinned) {
			it(`normalizes ${JSON.stringify(input)}`, () => {
				expect(pathBrowser.win32.normalize(input)).toBe(expected);
			});
		}
	});

	describe("posix.dirname", () => {
		for (const input of posixCases) {
			it(`matches Node for ${JSON.stringify(input)}`, () => {
				expect(pathBrowser.posix.dirname(input)).toBe(
					nodePath.posix.dirname(input),
				);
			});
		}
	});

	describe("win32.dirname", () => {
		for (const input of win32Cases) {
			it(`matches Node for ${JSON.stringify(input)}`, () => {
				expect(pathBrowser.win32.dirname(input)).toBe(
					nodePath.win32.dirname(input),
				);
			});
		}
	});

	describe("basename", () => {
		/** @type {[string, string?][]} */
		const cases = [
			["/foo/bar/baz.js"],
			["/foo/bar/baz.js", ".js"],
			["/foo/bar/"],
			["foo.js", ".js"],
			["foo.js", ".ts"],
			["/"],
			[""],
			["index"],
			["a/b/c.test.js", ".js"],
		];
		for (const [input, suffix] of cases) {
			it(`matches Node for ${JSON.stringify(input)} / ${JSON.stringify(suffix)}`, () => {
				expect(pathBrowser.basename(input, suffix)).toBe(
					nodePath.posix.basename(input, suffix),
				);
			});
		}
	});

	// Documented limitation: reserved Windows device names (CON, COM1, …) are not
	// special-cased, so `\\.\COM1:` differs from Node (which rewrites it to
	// `\\?\COM1:\`). Browser-impossible and never routed here. Pinned to the
	// shim's own output so any unintended change is caught.
	describe("win32.normalize reserved device name (documented divergence)", () => {
		it("does not special-case \\\\.\\COM1:", () => {
			expect(pathBrowser.win32.normalize("\\\\.\\COM1:")).toBe("\\\\.\\COM1:");
		});
	});
});
