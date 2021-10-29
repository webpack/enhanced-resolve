require("should");

var { Volume } = require("memfs");
var { ResolverFactory } = require("../");

describe("multiArgs", function () {
	/**
	 * @type {ReturnType<ResolverFactory['createResolver']>}
	 */
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

	it("should resolver.resolveSync parse multiArgs", () => {
		resolver.resolveSync({}, "/", "a").should.be.eql("/a/index");
		resolver.resolveSync({}, "/", "a", {}).should.be.eql("/a/index");
		resolver.resolveSync({}, "/", "a", {}, false).should.be.eql("/a/index");

		Array.isArray(resolver.resolveSync({}, "/", "a", {}, true)).should.be.eql(true);
		resolver.resolveSync({}, "/", "a", {}, true)[0].should.be.eql("/a/index");
		resolver.resolveSync({}, "/", "a", {}, true).length.should.be.eql(2);
	});
	it("should resolver.resolveAsync parse multiArgs", async () => {
		(await resolver.resolveAsync({}, "/", "a")).should.be.eql("/a/index");
		(await resolver.resolveAsync({}, "/", "a", {})).should.be.eql("/a/index");
		(await resolver.resolveAsync({}, "/", "a", {}, false)).should.be.eql("/a/index");

		Array.isArray((await resolver.resolveAsync({}, "/", "a", {}, true))).should.be.eql(true);
		(await resolver.resolveAsync({}, "/", "a", {}, true))[0].should.be.eql("/a/index");
		(await resolver.resolveAsync({}, "/", "a", {}, true)).length.should.be.eql(2);
	});
});
