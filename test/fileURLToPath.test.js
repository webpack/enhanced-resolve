"use strict";

const assert = require("assert");

const path = require("path");
const { pathToFileURL } = require("url");
const fileURLToPath = require("../lib/util/fileURLToPath");
const { describe, it } = require("./_runner");

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
				assert.strictEqual(fileURLToPath(input, { windows: false }), expected);
			});
		}
	});

	describe("windows branch", () => {
		for (const [input, expected] of windowsCases) {
			it(`converts ${input}`, () => {
				assert.strictEqual(fileURLToPath(input, { windows: true }), expected);
			});
		}
	});

	it("accepts a URL instance", () => {
		const url = new URL("file:///home/user/project");
		assert.strictEqual(
			fileURLToPath(url, { windows: false }),
			"/home/user/project",
		);
	});

	it("round-trips pathToFileURL on the host platform", () => {
		// Build a host-absolute path so the round-trip is correct on Windows
		// (drive letter) as well as POSIX, using the host-default platform branch.
		const pth = path.resolve("a b", "c");
		assert.strictEqual(fileURLToPath(pathToFileURL(pth)), pth);
	});

	it("throws for a non-file: scheme", () => {
		assert.throws(
			() => fileURLToPath("http://example.com/x"),
			(err) => err instanceof Error && err.message.includes("scheme file"),
		);
	});

	it("throws for an encoded slash in the posix branch", () => {
		assert.throws(
			() => fileURLToPath("file:///a%2fb", { windows: false }),
			/encoded \/ characters/,
		);
	});

	it("throws for an encoded backslash in the windows branch", () => {
		assert.throws(
			() => fileURLToPath("file:///C:/a%5cb", { windows: true }),
			/encoded \\ or \/ characters/,
		);
	});

	it("throws for a non-absolute windows drive path", () => {
		assert.throws(
			() => fileURLToPath("file:///foo", { windows: true }),
			(err) => err instanceof Error && err.message.includes("must be absolute"),
		);
	});

	it("throws for a posix host that is not empty", () => {
		assert.throws(
			() => fileURLToPath("file://host/x", { windows: false }),
			/host/,
		);
	});

	it("decodes a UNC path with an ASCII host in the windows branch", () => {
		assert.strictEqual(
			fileURLToPath("file://server/share/file.js", { windows: true }),
			"\\\\server\\share\\file.js",
		);
	});

	// Documented deviation: Node runs UNC hosts through domainToUnicode
	// (punycode); this helper keeps the host as-is. Identical for ASCII hosts,
	// differing only for rare internationalized UNC hosts.
	// cspell:ignore aagokeh
	it("keeps a punycode UNC host as-is (deviation from Node)", () => {
		assert.strictEqual(
			fileURLToPath("file://xn--h1aagokeh/a", { windows: true }),
			"\\\\xn--h1aagokeh\\a",
		);
	});
});
