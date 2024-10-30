const { Volume } = require("memfs");
const path = require("path");
const { ResolverFactory } = require("../");
const {
	posixSep,
	absoluteOsBasedResolvedPath,
	absoluteOsBasedPath,
	obps
} = require("./util/path-separator");

describe("fallback", function () {
	let resolver;

	beforeEach(function () {
		const fileSystem = Volume.fromJSON(
			{
				[`${absoluteOsBasedPath}a${obps}index`]: "",
				[`${absoluteOsBasedPath}a${obps}dir${obps}index`]: "",
				[`${absoluteOsBasedPath}recursive${obps}index`]: "",
				[`${absoluteOsBasedPath}recursive${obps}dir${obps}index`]: "",
				[`${absoluteOsBasedPath}recursive${obps}dir${obps}file`]: "",
				[`${absoluteOsBasedPath}recursive${obps}dir${obps}dir${obps}index`]: "",
				[`${absoluteOsBasedPath}b${obps}index`]: "",
				[`${absoluteOsBasedPath}b${obps}dir${obps}index`]: "",
				[`${absoluteOsBasedPath}c${obps}index`]: "",
				[`${absoluteOsBasedPath}c${obps}dir${obps}index`]: "",
				[`${absoluteOsBasedPath}d${obps}index.js`]: "",
				[`${absoluteOsBasedPath}d${obps}dir${obps}.empty`]: "",
				[`${absoluteOsBasedPath}e${obps}index`]: "",
				[`${absoluteOsBasedPath}e${obps}anotherDir${obps}index`]: "",
				[`${absoluteOsBasedPath}e${obps}dir${obps}file`]: ""
			},
			`${absoluteOsBasedPath}`
		);
		resolver = ResolverFactory.createResolver({
			fallback: {
				aliasA: "a",
				b$: `a${obps}index`,
				c$: `${absoluteOsBasedPath}a${obps}index`,
				multiAlias: ["b", "c", "d", "e", "a"],
				recursive: `recursive${obps}dir`,
				[`${absoluteOsBasedPath}d${obps}dir`]: `${absoluteOsBasedPath}c${obps}dir`,
				[`${absoluteOsBasedPath}d${obps}index.js`]: `${absoluteOsBasedPath}c${obps}index`,
				ignored: false
			},
			modules: `${absoluteOsBasedPath}`,
			useSyncFileSystemCalls: true,
			//@ts-ignore
			fileSystem: fileSystem
		});
	});

	it("should resolve a not aliased module", function () {
		expect(resolver.resolveSync({}, `${absoluteOsBasedPath}`, "a")).toBe(
			`${absoluteOsBasedResolvedPath}a${posixSep}index`
		);
		expect(
			resolver.resolveSync({}, `${absoluteOsBasedPath}`, `a${obps}index`)
		).toBe(`${absoluteOsBasedResolvedPath}a${posixSep}index`);
		expect(
			resolver.resolveSync({}, `${absoluteOsBasedPath}`, `a${obps}dir`)
		).toBe(`${absoluteOsBasedResolvedPath}a${posixSep}dir${posixSep}index`);
		expect(
			resolver.resolveSync(
				{},
				`${absoluteOsBasedPath}`,
				`a${obps}dir${obps}index`
			)
		).toBe(`${absoluteOsBasedResolvedPath}a${posixSep}dir${posixSep}index`);
	});
	it("should resolve an fallback module", function () {
		expect(resolver.resolveSync({}, `${absoluteOsBasedPath}`, "aliasA")).toBe(
			`${absoluteOsBasedResolvedPath}a${posixSep}index`
		);
		expect(
			resolver.resolveSync({}, `${absoluteOsBasedPath}`, `aliasA${obps}index`)
		).toBe(`${absoluteOsBasedResolvedPath}a${posixSep}index`);
		expect(
			resolver.resolveSync({}, `${absoluteOsBasedPath}`, `aliasA${obps}dir`)
		).toBe(`${absoluteOsBasedResolvedPath}a${posixSep}dir${posixSep}index`);
		expect(
			resolver.resolveSync(
				{},
				`${absoluteOsBasedPath}`,
				`aliasA${obps}dir${obps}index`
			)
		).toBe(`${absoluteOsBasedResolvedPath}a${posixSep}dir${posixSep}index`);
	});
	it("should resolve an ignore module", () => {
		expect(resolver.resolveSync({}, `${absoluteOsBasedPath}`, "ignored")).toBe(
			false
		);
	});
	it("should resolve a recursive aliased module", function () {
		expect(
			resolver.resolveSync({}, `${absoluteOsBasedPath}`, "recursive")
		).toBe(`${absoluteOsBasedResolvedPath}recursive${posixSep}index`);
		expect(
			resolver.resolveSync(
				{},
				`${absoluteOsBasedPath}`,
				`recursive${obps}index`
			)
		).toBe(`${absoluteOsBasedResolvedPath}recursive${posixSep}index`);
		expect(
			resolver.resolveSync({}, `${absoluteOsBasedPath}`, `recursive${obps}dir`)
		).toBe(
			`${absoluteOsBasedResolvedPath}recursive${posixSep}dir${posixSep}index`
		);
		expect(
			resolver.resolveSync(
				{},
				`${absoluteOsBasedPath}`,
				`recursive${obps}dir${obps}index`
			)
		).toBe(
			`${absoluteOsBasedResolvedPath}recursive${posixSep}dir${posixSep}index`
		);
		expect(
			resolver.resolveSync({}, `${absoluteOsBasedPath}`, `recursive${obps}file`)
		).toBe(
			`${absoluteOsBasedResolvedPath}recursive${posixSep}dir${posixSep}file`
		);
	});
	it("should resolve a file aliased module with a query", function () {
		expect(resolver.resolveSync({}, `${absoluteOsBasedPath}`, "b?query")).toBe(
			`${absoluteOsBasedResolvedPath}b${posixSep}index?query`
		);
		expect(resolver.resolveSync({}, `${absoluteOsBasedPath}`, "c?query")).toBe(
			`${absoluteOsBasedResolvedPath}c${posixSep}index?query`
		);
	});
	it("should resolve a path in a file aliased module", function () {
		expect(
			resolver.resolveSync({}, `${absoluteOsBasedPath}`, `b${obps}index`)
		).toBe(`${absoluteOsBasedResolvedPath}b${posixSep}index`);
		expect(
			resolver.resolveSync({}, `${absoluteOsBasedPath}`, `b${obps}dir`)
		).toBe(`${absoluteOsBasedResolvedPath}b${posixSep}dir${posixSep}index`);
		expect(
			resolver.resolveSync(
				{},
				`${absoluteOsBasedPath}`,
				`b${obps}dir${obps}index`
			)
		).toBe(`${absoluteOsBasedResolvedPath}b${posixSep}dir${posixSep}index`);
		expect(
			resolver.resolveSync({}, `${absoluteOsBasedPath}`, `c${obps}index`)
		).toBe(`${absoluteOsBasedResolvedPath}c${posixSep}index`);
		expect(
			resolver.resolveSync({}, `${absoluteOsBasedPath}`, `c${obps}dir`)
		).toBe(`${absoluteOsBasedResolvedPath}c${posixSep}dir${posixSep}index`);
		expect(
			resolver.resolveSync(
				{},
				`${absoluteOsBasedPath}`,
				`c${obps}dir${obps}index`
			)
		).toBe(`${absoluteOsBasedResolvedPath}c${posixSep}dir${posixSep}index`);
	});
	it("should resolve a file in multiple aliased dirs", function () {
		expect(
			resolver.resolveSync(
				{},
				`${absoluteOsBasedPath}`,
				`multiAlias${obps}dir${obps}file`
			)
		).toBe(`${absoluteOsBasedResolvedPath}e${posixSep}dir${posixSep}file`);
		expect(
			resolver.resolveSync(
				{},
				`${absoluteOsBasedPath}`,
				`multiAlias${obps}anotherDir`
			)
		).toBe(
			`${absoluteOsBasedResolvedPath}e${posixSep}anotherDir${posixSep}index`
		);
	});
	it("should log the correct info", done => {
		const log = [];
		resolver.resolve(
			{},
			`${absoluteOsBasedPath}`,
			`aliasA${obps}dir`,
			{ log: v => log.push(v) },
			(err, result) => {
				if (err) return done(err);
				expect(result).toBe(
					`${absoluteOsBasedResolvedPath}a${posixSep}dir${posixSep}index`
				);
				expect(log).toMatchSnapshot(path.sep === "/" ? "posix" : "win32");
				done();
			}
		);
	});
});
