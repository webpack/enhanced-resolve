const path = require("path");
const fs = require("fs");
const { ResolverFactory } = require("../");

const browserModule = path.join(__dirname, "fixtures", "browser-module");

function p() {
	return path.join.apply(
		path,
		[browserModule].concat(Array.prototype.slice.call(arguments))
	);
}

describe("browserField", () => {
	let resolver;

	beforeEach(() => {
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
			expect(result).toEqual(false);
			done();
		});
	});

	it("should ignore", () => {
		expect(resolver.resolveSync({}, p(), "./lib/ignore")).toEqual(false);
		expect(resolver.resolveSync({}, p(), "./lib/ignore.js")).toEqual(false);
		expect(resolver.resolveSync({}, p("lib"), "./ignore")).toEqual(false);
		expect(resolver.resolveSync({}, p("lib"), "./ignore.js")).toEqual(false);
	});

	it("should replace a file", () => {
		expect(resolver.resolveSync({}, p(), "./lib/replaced")).toEqual(
			p("lib", "browser.js")
		);
		expect(resolver.resolveSync({}, p(), "./lib/replaced.js")).toEqual(
			p("lib", "browser.js")
		);
		expect(resolver.resolveSync({}, p("lib"), "./replaced")).toEqual(
			p("lib", "browser.js")
		);
		expect(resolver.resolveSync({}, p("lib"), "./replaced.js")).toEqual(
			p("lib", "browser.js")
		);
	});

	it("should replace a module with a file", () => {
		expect(resolver.resolveSync({}, p(), "module-a")).toEqual(
			p("browser", "module-a.js")
		);
		expect(resolver.resolveSync({}, p("lib"), "module-a")).toEqual(
			p("browser", "module-a.js")
		);
	});

	it("should replace a module with a module", () => {
		expect(resolver.resolveSync({}, p(), "module-b")).toEqual(
			p("node_modules", "module-c.js")
		);
		expect(resolver.resolveSync({}, p("lib"), "module-b")).toEqual(
			p("node_modules", "module-c.js")
		);
	});

	it("should resolve in nested property", () => {
		expect(resolver.resolveSync({}, p(), "./lib/main1.js")).toEqual(
			p("lib", "main.js")
		);
		expect(resolver.resolveSync({}, p(), "./lib/main2.js")).toEqual(
			p("lib", "browser.js")
		);
	});

	it("should check only alias field properties", () => {
		expect(resolver.resolveSync({}, p(), "./toString")).toEqual(
			p("lib", "toString.js")
		);
	});
});
