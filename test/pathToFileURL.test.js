"use strict";

const assert = require("assert");
const pathToFileURL = require("../lib/util/pathToFileURL");
const { describe, it } = require("./_runner");

describe("pathToFileURL", () => {
	// Expected values are pinned literals (computed once from Node's reference
	// `url.pathToFileURL`) rather than computed at test time: the `{ windows }`
	// option only exists on newer Node.js versions and is ignored by Bun and
	// older runtimes, so calling the runtime's own `pathToFileURL` here would
	// compare against host-platform output and fail spuriously.
	const posixCases = [
		["/plain", "file:///plain"],
		["/a/b/c", "file:///a/b/c"],
		["/dir/", "file:///dir/"],
		["/a b/c", "file:///a%20b/c"],
		["/with#hash/file.js", "file:///with%23hash/file.js"],
		["/a?b", "file:///a%3Fb"],
		["/中文/x", "file:///%E4%B8%AD%E6%96%87/x"],
		// Characters the `URL` pathname setter would otherwise misread, so they
		// are percent-encoded up front. A backslash is a legal POSIX filename
		// character and must not become a separator.
		["/a%b", "file:///a%25b"],
		["/a\\b", "file:///a%5Cb"],
		["/a\nb", "file:///a%0Ab"],
		["/a\rb", "file:///a%0Db"],
		["/a\tb", "file:///a%09b"],
	];

	const windowsCases = [
		["C:\\a\\b", "file:///C:/a/b"],
		["C:\\dir\\", "file:///C:/dir/"],
		["C:\\a b\\c", "file:///C:/a%20b/c"],
		["C:\\a%b", "file:///C:/a%25b"],
		// On Windows a backslash is a separator, so it is not encoded.
		["\\\\server\\share\\file.js", "file://server/share/file.js"],
		["\\\\server\\share\\a b", "file://server/share/a%20b"],
	];

	for (const [input, expected] of posixCases) {
		it(`should convert ${JSON.stringify(input)} on posix`, () => {
			assert.strictEqual(
				pathToFileURL(input, { windows: false }).href,
				expected,
			);
		});
	}

	for (const [input, expected] of windowsCases) {
		it(`should convert ${JSON.stringify(input)} on windows`, () => {
			assert.strictEqual(
				pathToFileURL(input, { windows: true }).href,
				expected,
			);
		});
	}

	it("should reject a UNC path without a resource path", () => {
		assert.throws(
			() => pathToFileURL("\\\\server", { windows: true }),
			/Missing UNC resource path/,
		);
	});

	it("should reject a UNC path with an empty servername", () => {
		assert.throws(
			() => pathToFileURL("\\\\\\share", { windows: true }),
			/Empty UNC servername/,
		);
	});

	it("should follow the host platform when no option is given", () => {
		const isWindows = process.platform === "win32";
		const input = isWindows ? "C:\\a\\b" : "/a/b";

		assert.strictEqual(
			pathToFileURL(input).href,
			pathToFileURL(input, { windows: isWindows }).href,
		);
	});

	it("should round-trip through fileURLToPath", () => {
		const fileURLToPath = require("../lib/util/fileURLToPath");

		for (const [input] of posixCases) {
			assert.strictEqual(
				fileURLToPath(pathToFileURL(input, { windows: false }), {
					windows: false,
				}),
				input,
			);
		}
	});
});
