require("should");

var path = require("path");
var fs = require("fs");
var { ResolverFactory } = require("../");

var browserModule = path.join(__dirname, "fixtures", "browser-module");

function p() {
	return path.join.apply(
		path,
		[browserModule].concat(Array.prototype.slice.call(arguments))
	);
}

describe("browserField", function () {
	var resolver;

	beforeEach(function () {
		resolver = ResolverFactory.createResolver({
			aliasFields: [
				"browser",
				["innerBrowser1", "field2", "browser"], // not presented
				["innerBrowser1", "field", "browser"],
				["innerBrowser2", "browser"]
			],
			useSyncFileSystemCalls: true,
			fileSystem: fs
		});
	});

	it("should ignore", function (done) {
		resolver.resolve({}, p(), "./lib/ignore", {}, function (err, result) {
			if (err) throw err;
			result.should.be.eql(false);
			done();
		});
	});
	it("should ignore", function () {
		resolver.resolveSync({}, p(), "./lib/ignore").should.be.eql(false);
		resolver.resolveSync({}, p(), "./lib/ignore.js").should.be.eql(false);
		resolver.resolveSync({}, p("lib"), "./ignore").should.be.eql(false);
		resolver.resolveSync({}, p("lib"), "./ignore.js").should.be.eql(false);
	});

	it("should replace a file", function () {
		resolver
			.resolveSync({}, p(), "./lib/replaced")
			.should.be.eql(p("lib", "browser.js"));
		resolver
			.resolveSync({}, p(), "./lib/replaced.js")
			.should.be.eql(p("lib", "browser.js"));
		resolver
			.resolveSync({}, p("lib"), "./replaced")
			.should.be.eql(p("lib", "browser.js"));
		resolver
			.resolveSync({}, p("lib"), "./replaced.js")
			.should.be.eql(p("lib", "browser.js"));
	});

	it("should replace a module with a file", function () {
		resolver
			.resolveSync({}, p(), "module-a")
			.should.be.eql(p("browser", "module-a.js"));
		resolver
			.resolveSync({}, p("lib"), "module-a")
			.should.be.eql(p("browser", "module-a.js"));
	});

	it("should replace a module with a module", function () {
		resolver
			.resolveSync({}, p(), "module-b")
			.should.be.eql(p("node_modules", "module-c.js"));
		resolver
			.resolveSync({}, p("lib"), "module-b")
			.should.be.eql(p("node_modules", "module-c.js"));
	});

	it("should resolve in nested property", function () {
		resolver
			.resolveSync({}, p(), "./lib/main1.js")
			.should.be.eql(p("lib", "main.js"));
		resolver
			.resolveSync({}, p(), "./lib/main2.js")
			.should.be.eql(p("lib", "browser.js"));
	});
});
