"use strict";

const assert = require("assert");
const { describe, it } = require("node:test");

const {
	PathType,
	createCachedBasename,
	createCachedDirname,
	createCachedJoin,
	deprecatedInvalidSegmentRegEx,
	dirname,
	getType,
	invalidSegmentRegEx,
	isRelativeRequest,
	isSubPath,
	join,
	normalize,
} = require("../lib/util/path");

describe("util/path getType", () => {
	it("returns Empty for the empty string", () => {
		assert.strictEqual(getType(""), PathType.Empty);
	});

	it("classifies single-character inputs", () => {
		assert.strictEqual(getType("."), PathType.Relative);
		assert.strictEqual(getType("/"), PathType.AbsolutePosix);
		assert.strictEqual(getType("#"), PathType.Internal);
		assert.strictEqual(getType("a"), PathType.Normal);
	});

	it("classifies two-character inputs", () => {
		assert.strictEqual(getType(".."), PathType.Relative);
		assert.strictEqual(getType("./"), PathType.Relative);
		assert.strictEqual(getType(".x"), PathType.Normal);
		assert.strictEqual(getType("/a"), PathType.AbsolutePosix);
		assert.strictEqual(getType("#a"), PathType.Internal);
		assert.strictEqual(getType("C:"), PathType.AbsoluteWin);
		assert.strictEqual(getType("c:"), PathType.AbsoluteWin);
		assert.strictEqual(getType("ab"), PathType.Normal);
		assert.strictEqual(getType("1:"), PathType.Normal);
	});

	it("classifies longer inputs", () => {
		assert.strictEqual(getType("./a"), PathType.Relative);
		assert.strictEqual(getType("../a"), PathType.Relative);
		assert.strictEqual(getType(".a"), PathType.Normal);
		assert.strictEqual(getType("..a"), PathType.Normal);
		assert.strictEqual(getType(".a/"), PathType.Normal);
		assert.strictEqual(getType("/abc"), PathType.AbsolutePosix);
		assert.strictEqual(getType("#foo"), PathType.Internal);
		assert.strictEqual(getType("C:\\foo"), PathType.AbsoluteWin);
		assert.strictEqual(getType("c:/foo"), PathType.AbsoluteWin);
		assert.strictEqual(getType("foo"), PathType.Normal);
		assert.strictEqual(getType("9:/foo"), PathType.Normal);
		assert.strictEqual(getType("C:foo"), PathType.Normal);
	});

	it("classifies DOS device paths as Windows-absolute", () => {
		// Win32 file namespace (\\?\)
		assert.strictEqual(getType("\\\\?\\C:\\foo"), PathType.AbsoluteWin);
		assert.strictEqual(getType("\\\\?\\C:\\foo\\bar"), PathType.AbsoluteWin);
		assert.strictEqual(
			getType("\\\\?\\UNC\\server\\share"),
			PathType.AbsoluteWin,
		);
		assert.strictEqual(getType("\\\\?\\Volume{abc}\\f"), PathType.AbsoluteWin);
		// Win32 device namespace (\\.\)
		assert.strictEqual(getType("\\\\.\\C:\\foo"), PathType.AbsoluteWin);
		assert.strictEqual(getType("\\\\.\\PhysicalDrive0"), PathType.AbsoluteWin);
		// Bare prefix still counts — the filesystem will reject it, but
		// classifying it as Windows-absolute keeps downstream calls on
		// `path.win32` instead of silently falling back to posix.
		assert.strictEqual(getType("\\\\?\\"), PathType.AbsoluteWin);
		assert.strictEqual(getType("\\\\.\\"), PathType.AbsoluteWin);
	});

	it("does not classify non-DOS backslash paths as Windows-absolute", () => {
		// Plain UNC (\\server\share) is not a DOS device path — don't
		// misclassify it (its handling is out of scope of this change).
		assert.strictEqual(getType("\\\\server\\share"), PathType.Normal);
		// Too short to match a DOS device prefix.
		assert.strictEqual(getType("\\\\?"), PathType.Normal);
		assert.strictEqual(getType("\\\\."), PathType.Normal);
		// Second char must also be a backslash.
		assert.strictEqual(getType("\\?\\C:\\foo"), PathType.Normal);
		// Forward-slash variants aren't equivalent — Windows won't normalize
		// a DOS device path expressed with `/`.
		assert.strictEqual(getType("//?/C:/foo"), PathType.AbsolutePosix);
	});
});

describe("util/path normalize", () => {
	it("returns the input when empty", () => {
		assert.strictEqual(normalize(""), "");
	});

	it("normalizes Windows absolute paths", () => {
		assert.strictEqual(normalize("C:\\foo\\..\\bar"), "C:\\bar");
	});

	it("keeps relative paths relative", () => {
		assert.strictEqual(normalize("./a/b"), "./a/b");
		assert.strictEqual(normalize("./a/../b"), "./b");
	});

	it("normalizes posix absolute paths", () => {
		assert.strictEqual(normalize("/a/b/../c"), "/a/c");
	});

	it("normalizes normal paths through posix normalize", () => {
		assert.strictEqual(normalize("a/b/../c"), "a/c");
	});

	it("normalizes DOS device paths via win32", () => {
		assert.strictEqual(normalize("\\\\?\\C:\\foo\\..\\bar"), "\\\\?\\C:\\bar");
		assert.strictEqual(normalize("\\\\.\\C:\\foo\\..\\bar"), "\\\\.\\C:\\bar");
		assert.strictEqual(
			normalize("\\\\?\\UNC\\server\\share\\a\\..\\b"),
			"\\\\?\\UNC\\server\\share\\b",
		);
	});
});

describe("util/path join", () => {
	it("returns normalized rootPath when no request is given", () => {
		assert.strictEqual(join("/a/b", ""), "/a/b");
		assert.strictEqual(join("/a/b", undefined), "/a/b");
	});

	it("uses an absolute posix request as-is", () => {
		assert.strictEqual(join("/a/b", "/c/d"), "/c/d");
	});

	it("uses an absolute windows request as-is", () => {
		assert.strictEqual(join("/a/b", "C:\\c\\d"), "C:\\c\\d");
	});

	it("joins rooted posix-style paths", () => {
		assert.strictEqual(join("/a/b", "./c"), "/a/b/c");
		assert.strictEqual(join("a/b", "c"), "a/b/c");
		assert.strictEqual(join("./a", "b"), "a/b");
	});

	it("joins rooted windows-style paths", () => {
		assert.strictEqual(join("C:\\a", "b"), "C:\\a\\b");
	});

	it("joins DOS device paths with win32 semantics", () => {
		assert.strictEqual(join("\\\\?\\C:\\a", "b"), "\\\\?\\C:\\a\\b");
		assert.strictEqual(join("\\\\.\\C:\\a", "b"), "\\\\.\\C:\\a\\b");
		// Absolute DOS device request wins over any root.
		assert.strictEqual(join("/posix/root", "\\\\?\\C:\\c"), "\\\\?\\C:\\c");
	});
});

describe("util/path dirname", () => {
	it("computes posix dirname for posix paths", () => {
		assert.strictEqual(dirname("/a/b/c"), "/a/b");
		assert.strictEqual(dirname("a/b"), "a");
	});

	it("computes windows dirname for windows absolute paths", () => {
		assert.strictEqual(dirname("C:\\foo\\bar"), "C:\\foo");
	});

	it("computes windows dirname for DOS device paths", () => {
		assert.strictEqual(dirname("\\\\?\\C:\\foo\\bar"), "\\\\?\\C:\\foo");
		assert.strictEqual(dirname("\\\\.\\C:\\foo\\bar"), "\\\\.\\C:\\foo");
		assert.strictEqual(
			dirname("\\\\?\\UNC\\server\\share\\a\\b"),
			"\\\\?\\UNC\\server\\share\\a",
		);
	});
});

describe("util/path cachedJoin", () => {
	it("returns the same value on cache hit", () => {
		const cachedJoin = createCachedJoin().fn;
		const a = cachedJoin("/root", "a/b");
		const b = cachedJoin("/root", "a/b");
		assert.strictEqual(a, b);
		assert.strictEqual(a, "/root/a/b");
	});

	it("keeps separate caches per root", () => {
		const cachedJoin = createCachedJoin().fn;
		const a = cachedJoin("/x", "req");
		const b = cachedJoin("/y", "req");
		const a2 = cachedJoin("/x", "req");
		assert.strictEqual(a, a2);
		assert.notStrictEqual(a, b);
	});
});

describe("util/path cachedDirname", () => {
	it("returns the same value on cache hit", () => {
		const cachedDirname = createCachedDirname().fn;
		const a = cachedDirname("/cached/a/b");
		const b = cachedDirname("/cached/a/b");
		assert.strictEqual(a, b);
		assert.strictEqual(a, "/cached/a");
	});
});

describe("util/path cachedBasename", () => {
	it("returns the same value on cache hit", () => {
		const cachedBasename = createCachedBasename().fn;
		const a = cachedBasename("/cached/a/b");
		const b = cachedBasename("/cached/a/b");
		assert.strictEqual(a, b);
		assert.strictEqual(a, "b");
	});

	it("returns the same value on cache hit with suffix", () => {
		const cachedBasename = createCachedBasename().fn;
		const a = cachedBasename("/cached/a/b.ext", ".ext");
		const b = cachedBasename("/cached/a/b.ext", ".ext");
		assert.strictEqual(a, b);
		assert.strictEqual(a, "b");
	});

	it("keeps separate caches per root", () => {
		const cachedBasename = createCachedBasename().fn;
		const a = cachedBasename("/x");
		const b = cachedBasename("/y");
		const a2 = cachedBasename("/x");
		assert.strictEqual(a, a2);
		assert.notStrictEqual(a, b);
	});

	it("keeps separate caches per root with suffix", () => {
		const cachedBasename = createCachedBasename().fn;
		const a = cachedBasename("/x.ext", ".ext");
		const b = cachedBasename("/y.ext", ".ext");
		const a2 = cachedBasename("/x.ext", ".ext");
		assert.strictEqual(a, a2);
		assert.notStrictEqual(a, b);
	});
});

describe("util/path isRelativeRequest", () => {
	// Must match the legacy /^\.\.?(?:\/|$)/ regex exactly, since the helper
	// replaced it in several hot paths. Verify each branch individually.
	it("returns true for exactly '.'", () => {
		assert.strictEqual(isRelativeRequest("."), true);
	});

	it("returns true for exactly '..'", () => {
		assert.strictEqual(isRelativeRequest(".."), true);
	});

	it("returns true for './' and './foo/bar'", () => {
		assert.strictEqual(isRelativeRequest("./"), true);
		assert.strictEqual(isRelativeRequest("./foo"), true);
		assert.strictEqual(isRelativeRequest("./foo/bar"), true);
	});

	it("returns true for '../' and '../foo'", () => {
		assert.strictEqual(isRelativeRequest("../"), true);
		assert.strictEqual(isRelativeRequest("../foo"), true);
	});

	it("returns false for bare specifiers and absolute paths", () => {
		assert.strictEqual(isRelativeRequest(""), false);
		assert.strictEqual(isRelativeRequest("foo"), false);
		assert.strictEqual(isRelativeRequest("/abs"), false);
		assert.strictEqual(isRelativeRequest("#imports"), false);
		assert.strictEqual(isRelativeRequest("C:\\win"), false);
	});

	it("returns false for dotted names that are not relative requests", () => {
		// ".foo" is a normal specifier (hidden-file-style), not a relative request.
		assert.strictEqual(isRelativeRequest(".foo"), false);
		// "..foo" likewise — only "..", "../..." are relative.
		assert.strictEqual(isRelativeRequest("..foo"), false);
	});
});

describe("util/path isSubPath", () => {
	it("returns true for a child under parent", () => {
		assert.strictEqual(isSubPath("/a/b", "/a/b/c"), true);
	});

	it("returns false for a sibling that starts with the parent name", () => {
		assert.strictEqual(isSubPath("/app", "/app-other/file"), false);
	});

	it("handles parents that already end with a slash", () => {
		assert.strictEqual(isSubPath("/a/b/", "/a/b/c"), true);
	});

	it("handles parents that already end with a backslash", () => {
		assert.strictEqual(isSubPath("C:\\a\\b\\", "C:\\a\\b\\c"), true);
	});

	it("handles Windows-style children when the parent is not separator-terminated", () => {
		assert.strictEqual(isSubPath("C:\\a", "C:\\a\\b"), true);
	});

	it("returns false when child and parent are equal (without trailing separator)", () => {
		// A path is not a subpath of itself — there has to be a separator
		// after the parent prefix.
		assert.strictEqual(isSubPath("/a/b", "/a/b"), false);
	});

	it("returns true when child equals a parent that already ends with a separator", () => {
		// `/a/b/` IS considered a "prefix" of `/a/b/` — startsWith is true
		// and the old implementation agreed. Lock it in so later refactors
		// don't silently regress.
		assert.strictEqual(isSubPath("/a/b/", "/a/b/"), true);
	});

	it("returns false when parent is longer than child", () => {
		assert.strictEqual(isSubPath("/a/b/c", "/a/b"), false);
	});

	it("returns true for an empty parent only when the child starts with a separator", () => {
		// Matches the old `normalize("" + "/") === "/"` fallback semantics.
		assert.strictEqual(isSubPath("", "/a/b"), true);
		assert.strictEqual(isSubPath("", "C:\\a"), false);
		assert.strictEqual(isSubPath("", "foo"), false);
		assert.strictEqual(isSubPath("", ""), false);
	});
});

describe("util/path exported regexes", () => {
	it("deprecatedInvalidSegmentRegEx matches .. segments", () => {
		assert.strictEqual(deprecatedInvalidSegmentRegEx.test("/foo/../bar"), true);
	});

	it("invalidSegmentRegEx matches node_modules segments", () => {
		assert.strictEqual(invalidSegmentRegEx.test("/foo/node_modules/bar"), true);
		assert.strictEqual(invalidSegmentRegEx.test("/foo/../bar"), true);
	});
});

describe("util/path join fallbacks for special rootPath types", () => {
	it("falls back when rootPath is Empty and request is Relative", () => {
		// rootPath empty → falls into the last switch. Relative request returns
		// posixNormalize("") === "." which is itself relative, returned as-is.
		assert.strictEqual(join("", "./foo"), ".");
	});

	it("falls back when rootPath is Empty and request is a Normal name", () => {
		// Normal request: falls through to posixNormalize(rootPath) === "."
		assert.strictEqual(join("", "foo"), ".");
	});

	it("falls back when rootPath is Internal (#...) and request is Normal", () => {
		// rootPath "#x" (Internal) and request "foo" (Normal): falls through to
		// posixNormalize(rootPath).
		assert.strictEqual(join("#x", "foo"), "#x");
	});

	it("falls back when rootPath is Internal (#...) and request is Relative", () => {
		// rootPath "#x" (Internal) and request "./foo" (Relative): returns
		// posixNormalize(rootPath) ("#x"), not relative, so prefixed with "./".
		assert.strictEqual(join("#x", "./foo"), "./#x");
	});
});
