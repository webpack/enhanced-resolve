require("should");

var { Volume } = require("memfs");
var { ResolverFactory } = require("../");

describe("alias", function () {
	var resolver;

	beforeEach(function () {
		var fileSystem = Volume.fromJSON(
			{
				"/a/index": "",
				"/a/dir/index": "",
				"/recursive/index": "",
				"/recursive/dir/index": "",
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
			alias: {
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
		resolver.resolveSync({}, "/", "a").should.be.eql("/a/index");
		resolver.resolveSync({}, "/", "a/index").should.be.eql("/a/index");
		resolver.resolveSync({}, "/", "a/dir").should.be.eql("/a/dir/index");
		resolver.resolveSync({}, "/", "a/dir/index").should.be.eql("/a/dir/index");
	});
	it("should resolve an aliased module", function () {
		resolver.resolveSync({}, "/", "aliasA").should.be.eql("/a/index");
		resolver.resolveSync({}, "/", "aliasA/index").should.be.eql("/a/index");
		resolver.resolveSync({}, "/", "aliasA/dir").should.be.eql("/a/dir/index");
		resolver
			.resolveSync({}, "/", "aliasA/dir/index")
			.should.be.eql("/a/dir/index");
	});
	it("should resolve an ignore module", () => {
		resolver.resolveSync({}, "/", "ignored").should.be.eql(false);
	});
	it("should resolve a recursive aliased module", function () {
		resolver
			.resolveSync({}, "/", "recursive")
			.should.be.eql("/recursive/dir/index");
		resolver
			.resolveSync({}, "/", "recursive/index")
			.should.be.eql("/recursive/dir/index");
		resolver
			.resolveSync({}, "/", "recursive/dir")
			.should.be.eql("/recursive/dir/index");
		resolver
			.resolveSync({}, "/", "recursive/dir/index")
			.should.be.eql("/recursive/dir/index");
	});
	it("should resolve a file aliased module", function () {
		resolver.resolveSync({}, "/", "b").should.be.eql("/a/index");
		resolver.resolveSync({}, "/", "c").should.be.eql("/a/index");
	});
	it("should resolve a file aliased module with a query", function () {
		resolver.resolveSync({}, "/", "b?query").should.be.eql("/a/index?query");
		resolver.resolveSync({}, "/", "c?query").should.be.eql("/a/index?query");
	});
	it("should resolve a path in a file aliased module", function () {
		resolver.resolveSync({}, "/", "b/index").should.be.eql("/b/index");
		resolver.resolveSync({}, "/", "b/dir").should.be.eql("/b/dir/index");
		resolver.resolveSync({}, "/", "b/dir/index").should.be.eql("/b/dir/index");
		resolver.resolveSync({}, "/", "c/index").should.be.eql("/c/index");
		resolver.resolveSync({}, "/", "c/dir").should.be.eql("/c/dir/index");
		resolver.resolveSync({}, "/", "c/dir/index").should.be.eql("/c/dir/index");
	});
	it("should resolve a file aliased file", function () {
		resolver.resolveSync({}, "/", "d").should.be.eql("/c/index");
		resolver.resolveSync({}, "/", "d/dir/index").should.be.eql("/c/dir/index");
	});
	it("should resolve a file in multiple aliased dirs", function () {
		resolver
			.resolveSync({}, "/", "multiAlias/dir/file")
			.should.be.eql("/e/dir/file");
		resolver
			.resolveSync({}, "/", "multiAlias/anotherDir")
			.should.be.eql("/e/anotherDir/index");
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
				result.should.be.eql("/a/dir/index");
				log.should.be.eql([
					"resolve 'aliasA/dir' in '/'",
					"  Parsed request is a module",
					"  No description file found in / or above",
					"  aliased with mapping 'aliasA': 'a' to 'a/dir'",
					"    Parsed request is a module",
					"    No description file found in / or above",
					"    resolve as module",
					"      looking for modules in /",
					"        existing directory /a",
					"          No description file found in /a or above",
					"          No description file found in /a or above",
					"          no extension",
					"            /a/dir is not a file",
					"          .js",
					"            /a/dir.js doesn't exist",
					"          .json",
					"            /a/dir.json doesn't exist",
					"          .node",
					"            /a/dir.node doesn't exist",
					"          as directory",
					"            existing directory /a/dir",
					"              No description file found in /a/dir or above",
					"              using path: /a/dir/index",
					"                No description file found in /a/dir or above",
					"                no extension",
					"                  existing file: /a/dir/index",
					"                    reporting result /a/dir/index"
				]);
				done();
			}
		);
	});
});
