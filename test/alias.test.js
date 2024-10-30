const path = require("path");
const { Volume } = require("memfs");
const { ResolverFactory } = require("../");
const CachedInputFileSystem = require("../lib/CachedInputFileSystem");
const fs = require("fs");
const {
	posixSep,
	absoluteOsBasedResolvedPath,
	absoluteOsBasedPath,
	obps
} = require("./util/path-separator");

const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

describe("alias", () => {
	let resolver;

	beforeEach(() => {
		const fileSystem = Volume.fromJSON(
			{
				[`${absoluteOsBasedPath}a${obps}index`]: "",
				[`${absoluteOsBasedPath}a${obps}dir${obps}index`]: "",
				[`${absoluteOsBasedPath}recursive${obps}index`]: "",
				[`${absoluteOsBasedPath}recursive${obps}dir${obps}index`]: "",
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
			absoluteOsBasedPath
		);
		resolver = ResolverFactory.createResolver({
			alias: {
				aliasA: "a",
				b$: `a${obps}index`,
				c$: `${absoluteOsBasedPath}a${obps}index`,
				multiAlias: ["b", "c", "d", "e", "a"],
				recursive: `recursive${obps}dir`,
				[`${absoluteOsBasedPath}d${obps}dir`]: `${absoluteOsBasedPath}c${obps}dir`,
				[`${absoluteOsBasedPath}d${obps}index.js`]: `${absoluteOsBasedPath}c${obps}index`,
				// alias configuration should work
				"#": `${absoluteOsBasedPath}c${obps}dir`,
				"@": `${absoluteOsBasedPath}c${obps}dir`,
				ignored: false
			},
			modules: absoluteOsBasedPath,
			useSyncFileSystemCalls: true,
			//@ts-ignore
			fileSystem: fileSystem
		});
	});

	it("should resolve a not aliased module", () => {
		expect(resolver.resolveSync({}, absoluteOsBasedPath, "a")).toEqual(
			`${absoluteOsBasedResolvedPath}a${posixSep}index`
		);
		expect(
			resolver.resolveSync({}, absoluteOsBasedPath, `a${obps}index`)
		).toEqual(`${absoluteOsBasedResolvedPath}a${posixSep}index`);
		expect(
			resolver.resolveSync({}, absoluteOsBasedPath, `a${obps}dir`)
		).toEqual(`${absoluteOsBasedResolvedPath}a${posixSep}dir${posixSep}index`);
		expect(
			resolver.resolveSync({}, absoluteOsBasedPath, `a${obps}dir${obps}index`)
		).toEqual(`${absoluteOsBasedResolvedPath}a${posixSep}dir${posixSep}index`);
	});
	it("should resolve an aliased module", () => {
		expect(
			resolver.resolveSync({}, `${absoluteOsBasedPath}`, "aliasA")
		).toEqual(`${absoluteOsBasedResolvedPath}a${posixSep}index`);
		expect(
			resolver.resolveSync({}, `${absoluteOsBasedPath}`, `aliasA${obps}index`)
		).toEqual(`${absoluteOsBasedResolvedPath}a${posixSep}index`);
		expect(
			resolver.resolveSync({}, `${absoluteOsBasedPath}`, `aliasA${obps}dir`)
		).toEqual(`${absoluteOsBasedResolvedPath}a${posixSep}dir${posixSep}index`);
		expect(
			resolver.resolveSync(
				{},
				`${absoluteOsBasedPath}`,
				`aliasA${obps}dir${obps}index`
			)
		).toEqual(`${absoluteOsBasedResolvedPath}a${posixSep}dir${posixSep}index`);
	});
	it('should resolve "#" alias', () => {
		expect(resolver.resolveSync({}, `${absoluteOsBasedPath}`, "#")).toEqual(
			`${absoluteOsBasedResolvedPath}c${posixSep}dir${posixSep}index`
		);
		expect(
			resolver.resolveSync({}, `${absoluteOsBasedPath}`, `#${obps}index`)
		).toEqual(`${absoluteOsBasedResolvedPath}c${posixSep}dir${posixSep}index`);
	});
	it('should resolve "@" alias', () => {
		expect(resolver.resolveSync({}, `${absoluteOsBasedPath}`, "@")).toEqual(
			`${absoluteOsBasedResolvedPath}c${posixSep}dir${posixSep}index`
		);
		expect(
			resolver.resolveSync({}, `${absoluteOsBasedPath}`, `@${obps}index`)
		).toEqual(`${absoluteOsBasedResolvedPath}c${posixSep}dir${posixSep}index`);
	});
	it("should resolve an ignore module", () => {
		expect(
			resolver.resolveSync({}, `${absoluteOsBasedPath}`, "ignored")
		).toEqual(false);
	});
	it("should resolve a recursive aliased module", () => {
		expect(
			resolver.resolveSync({}, `${absoluteOsBasedPath}`, "recursive")
		).toEqual(
			`${absoluteOsBasedResolvedPath}recursive${posixSep}dir${posixSep}index`
		);
		expect(
			resolver.resolveSync(
				{},
				`${absoluteOsBasedPath}`,
				`recursive${obps}index`
			)
		).toEqual(
			`${absoluteOsBasedResolvedPath}recursive${posixSep}dir${posixSep}index`
		);
		expect(
			resolver.resolveSync({}, `${absoluteOsBasedPath}`, `recursive${obps}dir`)
		).toEqual(
			`${absoluteOsBasedResolvedPath}recursive${posixSep}dir${posixSep}index`
		);
		expect(
			resolver.resolveSync(
				{},
				`${absoluteOsBasedPath}`,
				`recursive${posixSep}dir${posixSep}index`
			)
		).toEqual(
			`${absoluteOsBasedResolvedPath}recursive${posixSep}dir${posixSep}index`
		);
	});
	it("should resolve a file aliased module", () => {
		expect(resolver.resolveSync({}, `${absoluteOsBasedPath}`, "b")).toEqual(
			`${absoluteOsBasedResolvedPath}a${posixSep}index`
		);
		expect(resolver.resolveSync({}, `${absoluteOsBasedPath}`, "c")).toEqual(
			`${absoluteOsBasedResolvedPath}a${posixSep}index`
		);
	});
	it("should resolve a file aliased module with a query", () => {
		expect(
			resolver.resolveSync({}, `${absoluteOsBasedPath}`, "b?query")
		).toEqual(`${absoluteOsBasedResolvedPath}a${posixSep}index?query`);
		expect(
			resolver.resolveSync({}, `${absoluteOsBasedPath}`, "c?query")
		).toEqual(`${absoluteOsBasedResolvedPath}a${posixSep}index?query`);
	});
	it("should resolve a path in a file aliased module", () => {
		expect(
			resolver.resolveSync({}, `${absoluteOsBasedPath}`, `b${obps}index`)
		).toEqual(`${absoluteOsBasedResolvedPath}b${posixSep}index`);
		expect(
			resolver.resolveSync({}, `${absoluteOsBasedPath}`, `b${obps}dir`)
		).toEqual(`${absoluteOsBasedResolvedPath}b${posixSep}dir${posixSep}index`);
		expect(
			resolver.resolveSync(
				{},
				`${absoluteOsBasedPath}`,
				`b${obps}dir${obps}index`
			)
		).toEqual(`${absoluteOsBasedResolvedPath}b${posixSep}dir${posixSep}index`);
		expect(
			resolver.resolveSync({}, `${absoluteOsBasedPath}`, `c${obps}index`)
		).toEqual(`${absoluteOsBasedResolvedPath}c${posixSep}index`);
		expect(
			resolver.resolveSync({}, `${absoluteOsBasedPath}`, `c${obps}dir`)
		).toEqual(`${absoluteOsBasedResolvedPath}c${posixSep}dir${posixSep}index`);
		expect(
			resolver.resolveSync(
				{},
				`${absoluteOsBasedPath}`,
				`c${obps}dir${obps}index`
			)
		).toEqual(`${absoluteOsBasedResolvedPath}c${posixSep}dir${posixSep}index`);
	});
	it("should resolve a file aliased file", () => {
		expect(resolver.resolveSync({}, `${absoluteOsBasedPath}`, "d")).toEqual(
			`${absoluteOsBasedResolvedPath}c${posixSep}index`
		);
		expect(
			resolver.resolveSync(
				{},
				`${absoluteOsBasedPath}`,
				`d${obps}dir${obps}index`
			)
		).toEqual(`${absoluteOsBasedResolvedPath}c${posixSep}dir${posixSep}index`);
	});
	it("should resolve a file in multiple aliased dirs", () => {
		expect(
			resolver.resolveSync(
				{},
				`${absoluteOsBasedPath}`,
				`multiAlias${obps}dir${obps}file`
			)
		).toEqual(`${absoluteOsBasedResolvedPath}e${posixSep}dir${posixSep}file`);
		expect(
			resolver.resolveSync(
				{},
				`${absoluteOsBasedPath}`,
				`multiAlias${obps}anotherDir`
			)
		).toEqual(
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

				expect(result).toEqual(
					`${absoluteOsBasedResolvedPath}a${posixSep}dir${posixSep}index`
				);
				expect(log).toMatchSnapshot(path.sep === "/" ? "posix" : "win32");

				done();
			}
		);
	});

	it("should work with absolute paths", done => {
		const resolver = ResolverFactory.createResolver({
			alias: {
				[path.resolve(__dirname, "fixtures", "foo")]: false
			},
			modules: path.resolve(__dirname, "fixtures"),
			fileSystem: nodeFileSystem
		});

		resolver.resolve({}, __dirname, `foo${obps}index`, {}, (err, result) => {
			if (err) done(err);
			expect(result).toEqual(false);
			done();
		});
	});
});
