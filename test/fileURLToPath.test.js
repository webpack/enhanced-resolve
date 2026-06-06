"use strict";

const path = require("path");
const { pathToFileURL } = require("url");
const fileURLToPath = require("../lib/util/fileURLToPath");

describe("fileURLToPath", () => {
	// Expected values are pinned literals (computed once from Node's reference
	// `url.fileURLToPath`) rather than computed at test time: the `{ windows }`
	// option only exists on Node >= 20.13/22.1 and is ignored by Bun and older
	// runtimes, so calling the runtime's own `fileURLToPath` here would compare
	// against host-platform output and fail spuriously.
	const posixCases = [
		["file:///", "/"],
		["file:///a/b/c", "/a/b/c"],
		["file:///a%20b/c", "/a b/c"],
		["file:///a/b%2Bc", "/a/b+c"],
		["file:///with%23hash/file.js", "/with#hash/file.js"],
		["file:///%E4%B8%AD%E6%96%87/x", "/中文/x"],
	];

	const windowsCases = [
		["file:///C:/foo", "C:\\foo"],
		["file:///C:/a%20b/c", "C:\\a b\\c"],
		["file:///c:/foo/bar.js", "c:\\foo\\bar.js"],
		["file://server/share/file.js", "\\\\server\\share\\file.js"],
		["file:///D:/%E4%B8%AD%E6%96%87/x", "D:\\中文\\x"],
	];

	describe("posix branch", () => {
		for (const [input, expected] of posixCases) {
			it(`converts ${input}`, () => {
				expect(fileURLToPath(input, { windows: false })).toBe(expected);
			});
		}
	});

	describe("windows branch", () => {
		for (const [input, expected] of windowsCases) {
			it(`converts ${input}`, () => {
				expect(fileURLToPath(input, { windows: true })).toBe(expected);
			});
		}
	});

	it("accepts a URL instance", () => {
		const url = new URL("file:///home/user/project");
		expect(fileURLToPath(url, { windows: false })).toBe("/home/user/project");
	});

	it("round-trips pathToFileURL on the host platform", () => {
		// Build a host-absolute path so the round-trip is correct on Windows
		// (drive letter) as well as POSIX, using the host-default platform branch.
		const p = path.resolve("a b", "c");
		expect(fileURLToPath(pathToFileURL(p))).toBe(p);
	});

	it("throws for a non-file: scheme", () => {
		expect(() => fileURLToPath("http://example.com/x")).toThrow("scheme file");
	});

	it("throws for an encoded slash in the posix branch", () => {
		expect(() => fileURLToPath("file:///a%2fb", { windows: false })).toThrow(
			/encoded \/ characters/,
		);
	});

	it("throws for an encoded backslash in the windows branch", () => {
		expect(() => fileURLToPath("file:///C:/a%5cb", { windows: true })).toThrow(
			/encoded \\ or \/ characters/,
		);
	});

	it("throws for a non-absolute windows drive path", () => {
		expect(() => fileURLToPath("file:///foo", { windows: true })).toThrow(
			"must be absolute",
		);
	});

	it("throws for a posix host that is not empty", () => {
		expect(() => fileURLToPath("file://host/x", { windows: false })).toThrow(
			/host/,
		);
	});

	it("decodes a UNC path with an ASCII host in the windows branch", () => {
		expect(
			fileURLToPath("file://server/share/file.js", { windows: true }),
		).toBe("\\\\server\\share\\file.js");
	});

	// Documented deviation: Node runs UNC hosts through domainToUnicode
	// (punycode); this helper keeps the host as-is. Identical for ASCII hosts,
	// differing only for rare internationalized UNC hosts.
	// cspell:ignore aagokeh
	it("keeps a punycode UNC host as-is (deviation from Node)", () => {
		expect(fileURLToPath("file://xn--h1aagokeh/a", { windows: true })).toBe(
			"\\\\xn--h1aagokeh\\a",
		);
	});
});
