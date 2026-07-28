"use strict";

const assert = require("assert");
const nodePath = require("path");
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
const { describe, it } = require("./_runner");

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

	it("classifies UNC paths as Windows-absolute", () => {
		// `path.win32` roots every path starting with two backslashes, so a
		// share belongs on win32 just like a DOS device path does.
		assert.strictEqual(getType("\\\\server\\share"), PathType.AbsoluteWin);
		assert.strictEqual(getType("\\\\server\\share\\a"), PathType.AbsoluteWin);
		// Too short to name a share, still rooted.
		assert.strictEqual(getType("\\\\"), PathType.AbsoluteWin);
		assert.strictEqual(getType("\\\\?"), PathType.AbsoluteWin);
		assert.strictEqual(getType("\\\\."), PathType.AbsoluteWin);
	});

	it("does not classify other backslash paths as Windows-absolute", () => {
		// A single leading backslash is a rooted path only on Windows, and a
		// filename character everywhere else — too ambiguous to reroute.
		assert.strictEqual(getType("\\?\\C:\\foo"), PathType.Normal);
		assert.strictEqual(getType("\\a\\b"), PathType.Normal);
		// A leading forward slash is a posix root, however the separator after
		// it is spelled — `path.win32` would read both as a UNC root.
		assert.strictEqual(getType("//?/C:/foo"), PathType.AbsolutePosix);
		assert.strictEqual(getType("//server/share"), PathType.AbsolutePosix);
		assert.strictEqual(getType("/\\server\\share"), PathType.AbsolutePosix);
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

	it("normalizes UNC paths via win32", () => {
		assert.strictEqual(
			normalize("\\\\server\\share\\a\\..\\b"),
			"\\\\server\\share\\b",
		);
		assert.strictEqual(
			normalize("\\\\server\\share\\\\a"),
			"\\\\server\\share\\a",
		);
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

	it("joins UNC paths with win32 semantics", () => {
		assert.strictEqual(
			join("\\\\server\\share\\a", "b"),
			"\\\\server\\share\\a\\b",
		);
		// Absolute UNC request wins over any root.
		assert.strictEqual(
			join("/posix/root", "\\\\server\\share\\a"),
			"\\\\server\\share\\a",
		);
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

	it("computes windows dirname for UNC paths", () => {
		assert.strictEqual(
			dirname("\\\\server\\share\\a\\b"),
			"\\\\server\\share\\a",
		);
		// The share itself is the root, so walking up stops there.
		assert.strictEqual(dirname("\\\\server\\share\\a"), "\\\\server\\share\\");
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

// Node's own `path` is the reference for how a path behaves. These tests keep
// `lib/util/path.js` answering the way `path.win32` and `path.posix` do, and
// spell out every shape where it deliberately answers differently.
describe("util/path alignment with node's path module", () => {
	// Which flavor node reads a path as: the two parsers disagree about the
	// root exactly when the path is Windows-specific.
	const nodeReadsAsWindows = (maybePath) =>
		nodePath.win32.parse(maybePath).root !==
		nodePath.posix.parse(maybePath).root;

	const nodeFlavor = (maybePath) =>
		nodeReadsAsWindows(maybePath) ? nodePath.win32 : nodePath.posix;

	// The shapes we answer differently on purpose, each asserted on its own in
	// "documented divergences" below.
	const isDocumentedDivergence = (maybePath) => {
		// a leading forward slash is a posix root however the next separator is
		// spelled, while `path.win32` reads two separators as a UNC root
		if (maybePath.startsWith("//") || maybePath.startsWith("/\\")) return true;
		// a single leading backslash roots a path only on windows
		if (maybePath.startsWith("\\") && !maybePath.startsWith("\\\\")) {
			return true;
		}
		// drive-relative (`C:foo`), which node roots but does not call absolute
		if (/^[a-zA-Z]:[^\\/]/.test(maybePath)) return true;
		// requests the resolver handles with its own semantics
		const type = getType(maybePath);
		return (
			type === PathType.Relative ||
			type === PathType.Empty ||
			type === PathType.Internal
		);
	};

	const requests = ["b", "./b", "../b", "b/c"];

	const assertMatchesNode = (maybePath) => {
		const flavor = nodeFlavor(maybePath);
		const subject = JSON.stringify(maybePath);
		assert.strictEqual(
			getType(maybePath) === PathType.AbsoluteWin,
			nodeReadsAsWindows(maybePath),
			`flavor of ${subject}`,
		);
		assert.strictEqual(
			normalize(maybePath),
			flavor.normalize(maybePath),
			`normalize(${subject})`,
		);
		assert.strictEqual(
			dirname(maybePath),
			flavor.dirname(maybePath),
			`dirname(${subject})`,
		);
		for (const request of requests) {
			assert.strictEqual(
				join(maybePath, request),
				flavor.join(maybePath, request),
				`join(${subject}, ${JSON.stringify(request)})`,
			);
		}
	};

	const paths = [
		// posix
		"/",
		"/a",
		"/a/b/c",
		"/a/b/c/",
		"/a//b",
		"/a/./b",
		"/a/../b",
		"/a/b\\c",
		"/a/b c/d",
		// windows drive
		"C:",
		"c:",
		"C:\\",
		"C:\\a",
		"C:\\a\\b",
		"C:/a/b",
		"C:\\a/b",
		"C:\\a\\..\\b",
		"C:\\a\\.\\b",
		"C:\\a\\\\b",
		"C:\\a\\b\\",
		"c:\\a",
		// UNC
		"\\\\server\\share",
		"\\\\server\\share\\",
		"\\\\server\\share\\a",
		"\\\\server\\share\\a\\b",
		"\\\\server\\share\\a\\..\\b",
		"\\\\server\\share\\a\\.\\b",
		"\\\\server\\share\\\\a",
		"\\\\server\\share\\a/b",
		"\\\\SERVER\\Share\\a",
		// DOS device
		"\\\\?\\C:\\a",
		"\\\\?\\C:\\a\\..\\b",
		"\\\\?\\UNC\\server\\share\\a",
		"\\\\.\\C:\\a",
		"\\\\.\\PhysicalDrive0",
		"\\\\?\\Volume{abc}\\f",
		"\\\\?\\",
		"\\\\",
		"\\\\?",
		"\\\\.",
		"\\\\a",
		// module requests
		"lodash",
		"@scope/pkg",
		"a",
	];

	for (const maybePath of paths) {
		it(`answers like node for ${JSON.stringify(maybePath)}`, () => {
			// a path listed here must not be one we diverge on
			assert.strictEqual(
				isDocumentedDivergence(maybePath),
				false,
				`${JSON.stringify(maybePath)} is a documented divergence`,
			);
			assertMatchesNode(maybePath);
		});
	}

	it("answers like node for generated path shapes", () => {
		// Seeded so a failure reproduces, and wide enough to reach shapes
		// nobody enumerated by hand.
		let seed = 42;
		const random = (max) => {
			seed = (seed + 0x6d2b79f5) | 0;
			let t = seed;
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((((t ^ (t >>> 14)) >>> 0) / 4294967296) * max) | 0;
		};
		const prefixes = [
			"",
			"/",
			"//",
			"\\",
			"\\\\",
			"C:\\",
			"C:/",
			"c:",
			"\\\\server\\share\\",
			"\\\\server\\share",
			"\\\\?\\C:\\",
			"\\\\.\\C:\\",
			"\\\\?\\UNC\\server\\share\\",
			"./",
			"../",
			"#",
		];
		const segments = [
			"a",
			"b",
			"..",
			".",
			"sub dir",
			"x.js",
			"",
			"node_modules",
		];
		const separators = ["/", "\\"];
		const makePath = () => {
			let result = prefixes[random(prefixes.length)];
			const count = random(5);
			for (let i = 0; i < count; i++) {
				if (i > 0) result += separators[random(separators.length)];
				result += segments[random(segments.length)];
			}
			if (random(4) === 0) result += separators[random(separators.length)];
			return result;
		};

		let compared = 0;
		for (let i = 0; i < 5000; i++) {
			const maybePath = makePath();
			if (isDocumentedDivergence(maybePath)) continue;
			assertMatchesNode(maybePath);
			compared++;
		}
		// guards against a generator change quietly emptying this
		assert.ok(compared > 1000, `only ${compared} shapes compared`);
	});

	describe("documented divergences", () => {
		it("reads a leading forward slash as a posix root", () => {
			for (const maybePath of [
				"//server/share",
				"/\\server\\share",
				"//?/C:/foo",
			]) {
				assert.strictEqual(getType(maybePath), PathType.AbsolutePosix);
				// node takes any two leading separators for a UNC root
				assert.strictEqual(nodeReadsAsWindows(maybePath), true);
			}
		});

		it("keeps a single leading backslash a filename character", () => {
			// rooted on windows, an ordinary character everywhere else, and
			// nothing in the string tells the two apart
			for (const maybePath of ["\\a\\b", "\\", "\\?\\C:\\foo"]) {
				assert.notStrictEqual(getType(maybePath), PathType.AbsoluteWin);
				assert.strictEqual(nodeReadsAsWindows(maybePath), true);
			}
		});

		it("keeps a drive-relative path normal", () => {
			// node roots `C:foo` at `C:` but does not call it absolute, and
			// `PathType` has no windows-relative member — classifying it as
			// `AbsoluteWin` would make `join` drop the root it is relative to
			assert.strictEqual(getType("C:foo"), PathType.Normal);
			assert.strictEqual(nodePath.win32.parse("C:foo").root, "C:");
			assert.strictEqual(nodePath.win32.isAbsolute("C:foo"), false);
		});

		it("keeps the ./ prefix of a relative request", () => {
			assert.strictEqual(normalize("./a/b"), "./a/b");
			assert.strictEqual(nodePath.posix.normalize("./a/b"), "a/b");
		});

		it("keeps an empty path empty", () => {
			assert.strictEqual(normalize(""), "");
			assert.strictEqual(nodePath.posix.normalize(""), ".");
		});

		it("keeps an internal request out of path handling", () => {
			assert.strictEqual(getType("#a/b"), PathType.Internal);
			assert.strictEqual(join("#x", "foo"), "#x");
			assert.strictEqual(nodePath.posix.join("#x", "foo"), "#x/foo");
		});
	});
});
