const path = require("path");
const {
	checkImportsExportsFieldTarget,
	PathType,
	getType,
	normalize
} = require("../lib/util/path");

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
	let pathSepDefault = path.sep;

	afterAll(() => {
		path.sep = pathSepDefault;
	});

	["win32", "posix"].forEach(platform => {
		const relativePathType =
			platform === "win32" ? "RelativeWin" : "RelativePosix";
		const separator = platform === "win32" ? "\\" : "/";

		it(`should resolve PathType.${relativePathType} for paths if path.sep is ${platform} (${separator})`, () => {
			path.sep = separator;

			expect(getType(".")).toBe(PathType[relativePathType]);
			expect(getType("..")).toBe(PathType[relativePathType]);
			expect(getType(`..${path.sep}`)).toBe(PathType[relativePathType]);
			expect(getType(`..${path.sep}test${path.sep}index.js`)).toBe(
				PathType[relativePathType]
			);
		});
	});
});

describe("normalize", () => {
	let pathSepDefault = path.sep;

	afterEach(() => {
		path.sep = pathSepDefault;
	});

	["win32", "posix"].forEach(platform => {
		const separator = platform === "win32" ? "\\" : "/";

		it(`should correctly normalize for relative/empty paths if path.sep is ${platform} (${separator})`, () => {
			path.sep = separator;

			expect(normalize("")).toBe("");
			expect(
				normalize(
					`..${path.sep}hello${path.sep}world${path.sep}..${path.sep}test.js`
				)
			).toBe(`..${path.sep}hello${path.sep}test.js`);
		});
	});

	it("should correctly normalize for PathType.AbsoluteWin", () => {
		path.sep = "\\";

		expect(
			normalize(
				`..${path.sep}hello${path.sep}world${path.sep}..${path.sep}test.js`
			)
		).toBe(`..${path.sep}hello${path.sep}test.js`);
	});

	it("should correctly normalize for PathType.AbsolutePosix", () => {
		path.sep = "/";

		expect(
			normalize(
				`..${path.sep}hello${path.sep}world${path.sep}..${path.sep}test.js`
			)
		).toBe(`..${path.sep}hello${path.sep}test.js`);
	});

	it("should correctly normalize for PathType.Normal", () => {
		expect(normalize("enhancedResolve/lib/util/../index")).toBe(
			"enhancedResolve/lib/index"
		);
	});
});
