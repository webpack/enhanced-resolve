require("should");
var ResolverFactory = require("../lib/ResolverFactory");
var MemoryFileSystem = require("memory-fs");

describe("jail", function() {
	var resolver;

	beforeEach(function() {
		var buf = Buffer.from("");
		var fileSystem = new MemoryFileSystem({
			"": true,
			someDir: {
				"": true,
				node_modules: {
					"": true,
					a: {
						"": true,
						"index.js": buf,
					},
					c: {
						"": true,
						"index.js": buf,
					},
				},
				myJail: {
					"": true,
					index: buf,
					node_modules: {
						"": true,
						a: {
							"": true,
							"index.js": buf,
							node_modules: {
								"": true,
								b: {
									"": true,
									"index.js": buf,
								},
							}
						},
					}
				}
			},
		});
		resolver = ResolverFactory.createResolver({
			modules: [["node_modules"]],
			useSyncFileSystemCalls: true,
			fileSystem: fileSystem,
			jail: "/someDir/myJail",
		});
	});

	it("should resolve a not aliased module", function() {
		// resolver.resolveSync({}, "/someDir/myJail/node_modules/a/node_modules", "a").should.be.eql("/someDir/myJail/node_modules/a/index.js");
		resolver.resolveSync({}, "/someDir/myJail/node_modules/a/node_modules", "c").should.be.eql("/someDir/node_modules/c/index.js");
		// resolver.resolveSync({}, "/", "a/index").should.be.eql("/a/index");
		// resolver.resolveSync({}, "/", "a/dir").should.be.eql("/a/dir/index");
		// resolver.resolveSync({}, "/", "a/dir/index").should.be.eql("/a/dir/index");
	});
	// it("should resolve an aliased module", function() {
	// 	resolver.resolveSync({}, "/", "aliasA").should.be.eql("/a/index");
	// 	resolver.resolveSync({}, "/", "aliasA/index").should.be.eql("/a/index");
	// 	resolver.resolveSync({}, "/", "aliasA/dir").should.be.eql("/a/dir/index");
	// 	resolver
	// 		.resolveSync({}, "/", "aliasA/dir/index")
	// 		.should.be.eql("/a/dir/index");
	// });
	// it("should resolve a recursive aliased module", function() {
	// 	resolver
	// 		.resolveSync({}, "/", "recursive")
	// 		.should.be.eql("/recursive/dir/index");
	// 	resolver
	// 		.resolveSync({}, "/", "recursive/index")
	// 		.should.be.eql("/recursive/dir/index");
	// 	resolver
	// 		.resolveSync({}, "/", "recursive/dir")
	// 		.should.be.eql("/recursive/dir/index");
	// 	resolver
	// 		.resolveSync({}, "/", "recursive/dir/index")
	// 		.should.be.eql("/recursive/dir/index");
	// });
	// it("should resolve a file aliased module", function() {
	// 	resolver.resolveSync({}, "/", "b").should.be.eql("/a/index");
	// 	resolver.resolveSync({}, "/", "c").should.be.eql("/a/index");
	// });
	// it("should resolve a file aliased module with a query", function() {
	// 	resolver.resolveSync({}, "/", "b?query").should.be.eql("/a/index?query");
	// 	resolver.resolveSync({}, "/", "c?query").should.be.eql("/a/index?query");
	// });
	// it("should resolve a path in a file aliased module", function() {
	// 	resolver.resolveSync({}, "/", "b/index").should.be.eql("/b/index");
	// 	resolver.resolveSync({}, "/", "b/dir").should.be.eql("/b/dir/index");
	// 	resolver.resolveSync({}, "/", "b/dir/index").should.be.eql("/b/dir/index");
	// 	resolver.resolveSync({}, "/", "c/index").should.be.eql("/c/index");
	// 	resolver.resolveSync({}, "/", "c/dir").should.be.eql("/c/dir/index");
	// 	resolver.resolveSync({}, "/", "c/dir/index").should.be.eql("/c/dir/index");
	// });
	// it("should resolve a file aliased file", function() {
	// 	resolver.resolveSync({}, "/", "d").should.be.eql("/c/index");
	// 	resolver.resolveSync({}, "/", "d/dir/index").should.be.eql("/c/dir/index");
	// });
});
