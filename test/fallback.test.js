require("should");

var { Volume } = require("memfs");
var { ResolverFactory } = require("../");

describe("fallback", function () {
	var resolver;

	beforeEach(function () {
		var fileSystem = Volume.fromJSON(
			{
				"/a/index": "",
				"/a/dir/index": "",
				"/recursive/index": "",
				"/recursive/dir/index": "",
				"/recursive/dir/file": "",
				"/recursive/dir/dir/index": "",
				"/b/index": "",
				"/b/dir/index": "",
				"/c/index": "",
				"/c/dir/index": "",
				"/d/index.js": "",
				"/d/dir/.empty": "",
				"/e/index": "",
				"/e/anotherDir/index": "",
				"/e/dir/file": ""
			},
			"/"
		);
		resolver = ResolverFactory.createResolver({
			fallback: {
				aliasA: "a",
				b$: "a/index",
				c$: "/a/index",
				multiAlias: ["b", "c", "d", "e", "a"],
				recursive: "recursive/dir",
				"/d/dir": "/c/dir",
				"/d/index.js": "/c/index",
				ignored: false
			},
			modules: "/",
			useSyncFileSystemCalls: true,
			fileSystem: fileSystem
		});
	});

	it("should resolve a not aliased module", function () {
		expect(resolver.resolveSync({}, "/", "a")).toBe("/a/index");
		expect(resolver.resolveSync({}, "/", "a/index")).toBe("/a/index");
		expect(resolver.resolveSync({}, "/", "a/dir")).toBe("/a/dir/index");
		expect(resolver.resolveSync({}, "/", "a/dir/index")).toBe("/a/dir/index");
	});
	it("should resolve an fallback module", function () {
		expect(resolver.resolveSync({}, "/", "aliasA")).toBe("/a/index");
		expect(resolver.resolveSync({}, "/", "aliasA/index")).toBe("/a/index");
		expect(resolver.resolveSync({}, "/", "aliasA/dir")).toBe("/a/dir/index");
		expect(resolver.resolveSync({}, "/", "aliasA/dir/index")).toBe(
			"/a/dir/index"
		);
	});
	it("should resolve an ignore module", () => {
		expect(resolver.resolveSync({}, "/", "ignored")).toBe(false);
	});
	it("should resolve a recursive aliased module", function () {
		expect(resolver.resolveSync({}, "/", "recursive")).toBe("/recursive/index");
		expect(resolver.resolveSync({}, "/", "recursive/index")).toBe(
			"/recursive/index"
		);
		expect(resolver.resolveSync({}, "/", "recursive/dir")).toBe(
			"/recursive/dir/index"
		);
		expect(resolver.resolveSync({}, "/", "recursive/dir/index")).toBe(
			"/recursive/dir/index"
		);
		expect(resolver.resolveSync({}, "/", "recursive/file")).toBe(
			"/recursive/dir/file"
		);
	});
	it("should resolve a file aliased module with a query", function () {
		expect(resolver.resolveSync({}, "/", "b?query")).toBe("/b/index?query");
		expect(resolver.resolveSync({}, "/", "c?query")).toBe("/c/index?query");
	});
	it("should resolve a path in a file aliased module", function () {
		expect(resolver.resolveSync({}, "/", "b/index")).toBe("/b/index");
		expect(resolver.resolveSync({}, "/", "b/dir")).toBe("/b/dir/index");
		expect(resolver.resolveSync({}, "/", "b/dir/index")).toBe("/b/dir/index");
		expect(resolver.resolveSync({}, "/", "c/index")).toBe("/c/index");
		expect(resolver.resolveSync({}, "/", "c/dir")).toBe("/c/dir/index");
		expect(resolver.resolveSync({}, "/", "c/dir/index")).toBe("/c/dir/index");
	});
	it("should resolve a file in multiple aliased dirs", function () {
		expect(resolver.resolveSync({}, "/", "multiAlias/dir/file")).toBe(
			"/e/dir/file"
		);
		expect(resolver.resolveSync({}, "/", "multiAlias/anotherDir")).toBe(
			"/e/anotherDir/index"
		);
	});
	it("should log the correct info", done => {
		const log = [];
		resolver.resolve(
			{},
			"/",
			"aliasA/dir",
			{ log: v => log.push(v) },
			(err, result) => {
				if (err) return done(err);
				expect(result).toBe("/a/dir/index");
				expect(log).toMatchSnapshot();
				done();
			}
		);
	});
});
