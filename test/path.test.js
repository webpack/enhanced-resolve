const path = require("path");
const {
	checkImportsExportsFieldTarget,
	PathType,
	getType,
	normalize
} = require("../lib/util/path");

// It's enough to use path.sep for tests because the repository has Windows test-runners,
// but for understanding what to expect, we should know about platform and path-type in tests.
const isWin32 = process.platform === "win32";
const currentPathType = isWin32 ? "win32" : "posix";

describe("checkImportsExportsFieldTarget", () => {
	/**
	 * @type {string[]}
	 */
	const errorCases = [
		"../a.js",
		"../",
		"./a/b/../../../c.js",
		"./a/b/../../../",
		"./../../c.js",
		"./../../",
		"./a/../b/../../c.js",
		"./a/../b/../../",
		"./././../"
	];

	errorCases.forEach(case_ => {
		it(case_, done => {
			const error = checkImportsExportsFieldTarget(case_);
			if (!error) return done("expect error");

			expect(error).toBeInstanceOf(Error);
			expect(error.message).toMatch(/Trying to access out of package scope/);
			done();
		});
	});
});

describe("getPath", () => {
	const relativePathType = isWin32 ? "RelativeWin" : "RelativePosix";

	it(`should resolve PathType.${relativePathType} for paths if path.sep is ${currentPathType} (${path.sep})`, () => {
		expect(getType(".")).toBe(PathType[relativePathType]);
		expect(getType("..")).toBe(PathType[relativePathType]);
		expect(getType(`..${path.sep}`)).toBe(PathType[relativePathType]);
		expect(getType(`..${path.sep}test${path.sep}index.js`)).toBe(
			PathType[relativePathType]
		);
	});
});

describe("normalize", () => {
	it(`should correctly normalize for empty path if path.sep is ${currentPathType} (${path.sep})`, () => {
		const pathToNormalize = "";

		expect(getType(pathToNormalize)).toBe(PathType.Empty);
		expect(normalize(pathToNormalize)).toBe("");
	});

	it(`should correctly normalize for relative path if path.sep is ${currentPathType} (${path.sep})`, () => {
		const pathToNormalize = `..${path.sep}hello${path.sep}world${path.sep}..${path.sep}test.js`;

		expect(getType(pathToNormalize)).toBe(
			isWin32 ? PathType.RelativeWin : PathType.RelativePosix
		);
		expect(normalize(pathToNormalize)).toBe(
			`..${path.sep}hello${path.sep}test.js`
		);
	});

	it(`should correctly normalize for absolute path if path.sep is ${currentPathType} (${path.sep})`, () => {
		const basePath = `${path.sep}hello${path.sep}world${path.sep}..${path.sep}test.js`;
		const getAbsolutePathPrefixBasedOnPlatform = pathStr =>
			isWin32 ? `X:${pathStr}` : pathStr;
		const pathToNormalize = getAbsolutePathPrefixBasedOnPlatform(basePath);

		expect(getType(pathToNormalize)).toBe(
			isWin32 ? PathType.AbsoluteWin : PathType.AbsolutePosix
		);
		expect(normalize(pathToNormalize)).toBe(
			getAbsolutePathPrefixBasedOnPlatform(`${path.sep}hello${path.sep}test.js`)
		);
	});

	it("should correctly normalize for PathType.Normal", () => {
		const pathToNormalize = "enhancedResolve/lib/util/../index";

		expect(getType(pathToNormalize)).toBe(PathType.Normal);
		expect(normalize(pathToNormalize)).toBe("enhancedResolve/lib/index");
	});
});
