"use strict";

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
		expect(getType("")).toBe(PathType.Empty);
	});

	it("classifies single-character inputs", () => {
		expect(getType(".")).toBe(PathType.Relative);
		expect(getType("/")).toBe(PathType.AbsolutePosix);
		expect(getType("#")).toBe(PathType.Internal);
		expect(getType("a")).toBe(PathType.Normal);
	});

	it("classifies two-character inputs", () => {
		expect(getType("..")).toBe(PathType.Relative);
		expect(getType("./")).toBe(PathType.Relative);
		expect(getType(".x")).toBe(PathType.Normal);
		expect(getType("/a")).toBe(PathType.AbsolutePosix);
		expect(getType("#a")).toBe(PathType.Internal);
		expect(getType("C:")).toBe(PathType.AbsoluteWin);
		expect(getType("c:")).toBe(PathType.AbsoluteWin);
		expect(getType("ab")).toBe(PathType.Normal);
		expect(getType("1:")).toBe(PathType.Normal);
	});

	it("classifies longer inputs", () => {
		expect(getType("./a")).toBe(PathType.Relative);
		expect(getType("../a")).toBe(PathType.Relative);
		expect(getType(".a")).toBe(PathType.Normal);
		expect(getType("..a")).toBe(PathType.Normal);
		expect(getType(".a/")).toBe(PathType.Normal);
		expect(getType("/abc")).toBe(PathType.AbsolutePosix);
		expect(getType("#foo")).toBe(PathType.Internal);
		expect(getType("C:\\foo")).toBe(PathType.AbsoluteWin);
		expect(getType("c:/foo")).toBe(PathType.AbsoluteWin);
		expect(getType("foo")).toBe(PathType.Normal);
		expect(getType("9:/foo")).toBe(PathType.Normal);
		expect(getType("C:foo")).toBe(PathType.Normal);
	});
});

describe("util/path normalize", () => {
	it("returns the input when empty", () => {
		expect(normalize("")).toBe("");
	});

	it("normalizes Windows absolute paths", () => {
		expect(normalize("C:\\foo\\..\\bar")).toBe("C:\\bar");
	});

	it("keeps relative paths relative", () => {
		expect(normalize("./a/b")).toBe("./a/b");
		expect(normalize("./a/../b")).toBe("./b");
	});

	it("normalizes posix absolute paths", () => {
		expect(normalize("/a/b/../c")).toBe("/a/c");
	});

	it("normalizes normal paths through posix normalize", () => {
		expect(normalize("a/b/../c")).toBe("a/c");
	});
});

describe("util/path join", () => {
	it("returns normalized rootPath when no request is given", () => {
		expect(join("/a/b", "")).toBe("/a/b");
		expect(join("/a/b", undefined)).toBe("/a/b");
	});

	it("uses an absolute posix request as-is", () => {
		expect(join("/a/b", "/c/d")).toBe("/c/d");
	});

	it("uses an absolute windows request as-is", () => {
		expect(join("/a/b", "C:\\c\\d")).toBe("C:\\c\\d");
	});

	it("joins rooted posix-style paths", () => {
		expect(join("/a/b", "./c")).toBe("/a/b/c");
		expect(join("a/b", "c")).toBe("a/b/c");
		expect(join("./a", "b")).toBe("a/b");
	});

	it("joins rooted windows-style paths", () => {
		expect(join("C:\\a", "b")).toBe("C:\\a\\b");
	});
});

describe("util/path dirname", () => {
	it("computes posix dirname for posix paths", () => {
		expect(dirname("/a/b/c")).toBe("/a/b");
		expect(dirname("a/b")).toBe("a");
	});

	it("computes windows dirname for windows absolute paths", () => {
		expect(dirname("C:\\foo\\bar")).toBe("C:\\foo");
	});
});

describe("util/path cachedJoin", () => {
	it("returns the same value on cache hit", () => {
		const cachedJoin = createCachedJoin().fn;
		const a = cachedJoin("/root", "a/b");
		const b = cachedJoin("/root", "a/b");
		expect(a).toBe(b);
		expect(a).toBe("/root/a/b");
	});

	it("keeps separate caches per root", () => {
		const cachedJoin = createCachedJoin().fn;
		const a = cachedJoin("/x", "req");
		const b = cachedJoin("/y", "req");
		const a2 = cachedJoin("/x", "req");
		expect(a).toBe(a2);
		expect(a).not.toBe(b);
	});
});

describe("util/path cachedDirname", () => {
	it("returns the same value on cache hit", () => {
		const cachedDirname = createCachedDirname().fn;
		const a = cachedDirname("/cached/a/b");
		const b = cachedDirname("/cached/a/b");
		expect(a).toBe(b);
		expect(a).toBe("/cached/a");
	});
});

describe("util/path cachedBasename", () => {
	it("returns null when path contains no separators", () => {
		const cachedBasename = createCachedBasename().fn;

		expect(cachedBasename("foo")).toBe("foo");
	});

	it("returns basename after the last forward slash", () => {
		const cachedBasename = createCachedBasename().fn;

		expect(cachedBasename("/a/b/c")).toBe("c");
	});

	it("returns the same value on cache hit", () => {
		const cachedBasename = createCachedBasename().fn;
		const a = cachedBasename("/cached/a/b");
		const b = cachedBasename("/cached/a/b");
		expect(a).toBe(b);
		expect(a).toBe("b");
	});

	it("returns the same value on cache hit with suffix", () => {
		const cachedBasename = createCachedBasename().fn;
		const a = cachedBasename("/cached/a/b.ext", ".ext");
		const b = cachedBasename("/cached/a/b.ext", ".ext");
		expect(a).toBe(b);
		expect(a).toBe("b");
	});

	it("keeps separate caches per root", () => {
		const cachedBasename = createCachedBasename().fn;
		const a = cachedBasename("/x");
		const b = cachedBasename("/y");
		const a2 = cachedBasename("/x");
		expect(a).toBe(a2);
		expect(a).not.toBe(b);
	});

	it("keeps separate caches per root with suffix", () => {
		const cachedBasename = createCachedBasename().fn;
		const a = cachedBasename("/x.ext", ".ext");
		const b = cachedBasename("/y.ext", ".ext");
		const a2 = cachedBasename("/x.ext", ".ext");
		expect(a).toBe(a2);
		expect(a).not.toBe(b);
	});
});

describe("util/path isRelativeRequest", () => {
	// Must match the legacy /^\.\.?(?:\/|$)/ regex exactly, since the helper
	// replaced it in several hot paths. Verify each branch individually.
	it("returns true for exactly '.'", () => {
		expect(isRelativeRequest(".")).toBe(true);
	});

	it("returns true for exactly '..'", () => {
		expect(isRelativeRequest("..")).toBe(true);
	});

	it("returns true for './' and './foo/bar'", () => {
		expect(isRelativeRequest("./")).toBe(true);
		expect(isRelativeRequest("./foo")).toBe(true);
		expect(isRelativeRequest("./foo/bar")).toBe(true);
	});

	it("returns true for '../' and '../foo'", () => {
		expect(isRelativeRequest("../")).toBe(true);
		expect(isRelativeRequest("../foo")).toBe(true);
	});

	it("returns false for bare specifiers and absolute paths", () => {
		expect(isRelativeRequest("")).toBe(false);
		expect(isRelativeRequest("foo")).toBe(false);
		expect(isRelativeRequest("/abs")).toBe(false);
		expect(isRelativeRequest("#imports")).toBe(false);
		expect(isRelativeRequest("C:\\win")).toBe(false);
	});

	it("returns false for dotted names that are not relative requests", () => {
		// ".foo" is a normal specifier (hidden-file-style), not a relative request.
		expect(isRelativeRequest(".foo")).toBe(false);
		// "..foo" likewise — only "..", "../..." are relative.
		expect(isRelativeRequest("..foo")).toBe(false);
	});
});

describe("util/path isSubPath", () => {
	it("returns true for a child under parent", () => {
		expect(isSubPath("/a/b", "/a/b/c")).toBe(true);
	});

	it("returns false for a sibling that starts with the parent name", () => {
		expect(isSubPath("/app", "/app-other/file")).toBe(false);
	});

	it("handles parents that already end with a slash", () => {
		expect(isSubPath("/a/b/", "/a/b/c")).toBe(true);
	});

	it("handles parents that already end with a backslash", () => {
		expect(isSubPath("C:\\a\\b\\", "C:\\a\\b\\c")).toBe(true);
	});
});

describe("util/path exported regexes", () => {
	it("deprecatedInvalidSegmentRegEx matches .. segments", () => {
		expect(deprecatedInvalidSegmentRegEx.test("/foo/../bar")).toBe(true);
	});

	it("invalidSegmentRegEx matches node_modules segments", () => {
		expect(invalidSegmentRegEx.test("/foo/node_modules/bar")).toBe(true);
		expect(invalidSegmentRegEx.test("/foo/../bar")).toBe(true);
	});
});

describe("util/path join fallbacks for special rootPath types", () => {
	it("falls back when rootPath is Empty and request is Relative", () => {
		// rootPath empty → falls into the last switch. Relative request returns
		// posixNormalize("") === "." which is itself relative, returned as-is.
		expect(join("", "./foo")).toBe(".");
	});

	it("falls back when rootPath is Empty and request is a Normal name", () => {
		// Normal request: falls through to posixNormalize(rootPath) === "."
		expect(join("", "foo")).toBe(".");
	});

	it("falls back when rootPath is Internal (#...) and request is Normal", () => {
		// rootPath "#x" (Internal) and request "foo" (Normal): falls through to
		// posixNormalize(rootPath).
		expect(join("#x", "foo")).toBe("#x");
	});

	it("falls back when rootPath is Internal (#...) and request is Relative", () => {
		// rootPath "#x" (Internal) and request "./foo" (Relative): returns
		// posixNormalize(rootPath) ("#x"), not relative, so prefixed with "./".
		expect(join("#x", "./foo")).toBe("./#x");
	});
});
