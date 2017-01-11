var ResolverFactory = require("../lib/ResolverFactory");
var MemoryFileSystem = require("memory-fs");
var should = require("should");

describe("alias", function() {
	var resolver;

	beforeEach(function() {
		var buf = new Buffer("");
		var fileSystem = new MemoryFileSystem({
			"": true,
			a: {
				"": true,
				index: buf,
				dir: {
					"": true,
					index: buf
				}
			},
			recursive: {
				"": true,
				index: buf,
				dir: {
					"": true,
					index: buf
				}
			},
			b: {
				"": true,
				index: buf,
				dir: {
					"": true,
					index: buf
				}
			},
			c: {
				"": true,
				index: buf,
				dir: {
					"": true,
					index: buf
				}
			}
		});
		resolver = ResolverFactory.createResolver({
			alias: {
				aliasA: "a",
				paramsA: "a?x=1",
				"b$": "a/index",
				"c$": "/a/index",
				"recursive": "recursive/dir"
			},
			modules: "/",
			useSyncFileSystemCalls: true,
			fileSystem: fileSystem
		})
	});

	it("should resolve a not aliased module", function() {
		resolver.resolveSync({}, "/", "a").should.be.eql("/a/index");
		resolver.resolveSync({}, "/", "a/index").should.be.eql("/a/index");
		resolver.resolveSync({}, "/", "a/dir").should.be.eql("/a/dir/index");
		resolver.resolveSync({}, "/", "a/dir/index").should.be.eql("/a/dir/index");
	});
	it("should resolve an aliased module", function() {
		resolver.resolveSync({}, "/", "aliasA").should.be.eql("/a/index");
		resolver.resolveSync({}, "/", "aliasA/index").should.be.eql("/a/index");
		resolver.resolveSync({}, "/", "aliasA/dir").should.be.eql("/a/dir/index");
		resolver.resolveSync({}, "/", "aliasA/dir/index").should.be.eql("/a/dir/index");
	});
	it("should resolve an aliased module with a query", function() {
		resolver.resolveSync({}, "/", "paramsA").should.be.eql("/a/index?x=1");
		resolver.resolveSync({}, "/", "paramsA?x=2").should.be.eql("/a/index?x=2");
		resolver.resolveSync({}, "/", "paramsA?y=1").should.be.eql("/a/index?x=1&y=1");
	});
	it("should resolve a recursive aliased module", function() {
		resolver.resolveSync({}, "/", "recursive").should.be.eql("/recursive/dir/index");
		resolver.resolveSync({}, "/", "recursive/index").should.be.eql("/recursive/dir/index");
		resolver.resolveSync({}, "/", "recursive/dir").should.be.eql("/recursive/dir/index");
		resolver.resolveSync({}, "/", "recursive/dir/index").should.be.eql("/recursive/dir/index");
	});
	it("should resolve a file aliased module", function() {
		resolver.resolveSync({}, "/", "b").should.be.eql("/a/index");
		resolver.resolveSync({}, "/", "c").should.be.eql("/a/index");
	});
	it("should resolve a file aliased module with a query", function() {
		resolver.resolveSync({}, "/", "b?query").should.be.eql("/a/index?query");
		resolver.resolveSync({}, "/", "c?query").should.be.eql("/a/index?query");
	});
	it("should resolve a path in a file aliased module", function() {
		resolver.resolveSync({}, "/", "b/index").should.be.eql("/b/index");
		resolver.resolveSync({}, "/", "b/dir").should.be.eql("/b/dir/index");
		resolver.resolveSync({}, "/", "b/dir/index").should.be.eql("/b/dir/index");
		resolver.resolveSync({}, "/", "c/index").should.be.eql("/c/index");
		resolver.resolveSync({}, "/", "c/dir").should.be.eql("/c/dir/index");
		resolver.resolveSync({}, "/", "c/dir/index").should.be.eql("/c/dir/index");
	});

});
