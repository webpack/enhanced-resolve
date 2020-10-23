var should = require("should");

var path = require("path");
var resolve = require("../");

var fixtures = path.join(__dirname, "fixtures");

const asyncContextResolve = resolve.create({
	extensions: [".js", ".json", ".node"],
	resolveToContext: true
});

const syncContextResolve = resolve.create.sync({
	extensions: [".js", ".json", ".node"],
	resolveToContext: true
});

const issue238Resolve = resolve.create({
	extensions: [".js", ".jsx", ".ts", ".tsx"],
	modules: ["src/a", "src/b", "src/common", "node_modules"]
});

const preferRelativeResolve = resolve.create({
	preferRelative: true
});

function testResolve(name, context, moduleName, result) {
	describe(name, function () {
		it("should resolve sync correctly", function () {
			var filename = resolve.sync(context, moduleName);
			should.exist(filename);
			filename.should.equal(result);
		});
		it("should resolve async correctly", function (done) {
			resolve(context, moduleName, function (err, filename) {
				if (err) return done(err);
				should.exist(filename);
				filename.should.equal(result);
				done();
			});
		});
	});
}

function testResolveContext(name, context, moduleName, result) {
	describe(name, function () {
		it("should resolve async correctly", function (done) {
			asyncContextResolve(context, moduleName, function (err, filename) {
				if (err) done(err);
				should.exist(filename);
				filename.should.equal(result);
				done();
			});
		});
		it("should resolve sync correctly", function () {
			var filename = syncContextResolve(context, moduleName);
			should.exist(filename);
			filename.should.equal(result);
		});
	});
}
describe("resolve", function () {
	testResolve(
		"absolute path",
		fixtures,
		path.join(fixtures, "main1.js"),
		path.join(fixtures, "main1.js")
	);

	testResolve(
		"file with .js",
		fixtures,
		"./main1.js",
		path.join(fixtures, "main1.js")
	);
	testResolve(
		"file without extension",
		fixtures,
		"./main1",
		path.join(fixtures, "main1.js")
	);
	testResolve(
		"another file with .js",
		fixtures,
		"./a.js",
		path.join(fixtures, "a.js")
	);
	testResolve(
		"another file without extension",
		fixtures,
		"./a",
		path.join(fixtures, "a.js")
	);
	testResolve(
		"file in module with .js",
		fixtures,
		"m1/a.js",
		path.join(fixtures, "node_modules", "m1", "a.js")
	);
	testResolve(
		"file in module without extension",
		fixtures,
		"m1/a",
		path.join(fixtures, "node_modules", "m1", "a.js")
	);
	testResolve(
		"another file in module without extension",
		fixtures,
		"complexm/step1",
		path.join(fixtures, "node_modules", "complexm", "step1.js")
	);
	testResolve(
		"from submodule to file in sibling module",
		path.join(fixtures, "node_modules", "complexm"),
		"m2/b.js",
		path.join(fixtures, "node_modules", "m2", "b.js")
	);
	testResolve(
		"from submodule to file in sibling of parent module",
		path.join(fixtures, "node_modules", "complexm", "web_modules", "m1"),
		"m2/b.js",
		path.join(fixtures, "node_modules", "m2", "b.js")
	);
	testResolve(
		"from nested directory to overwritten file in module",
		path.join(fixtures, "multiple_modules"),
		"m1/a.js",
		path.join(fixtures, "multiple_modules", "node_modules", "m1", "a.js")
	);
	testResolve(
		"from nested directory to not overwritten file in module",
		path.join(fixtures, "multiple_modules"),
		"m1/b.js",
		path.join(fixtures, "node_modules", "m1", "b.js")
	);

	testResolve(
		"file with query",
		fixtures,
		"./main1.js?query",
		path.join(fixtures, "main1.js") + "?query"
	);
	testResolve(
		"file with fragment",
		fixtures,
		"./main1.js#fragment",
		path.join(fixtures, "main1.js") + "#fragment"
	);
	testResolve(
		"file with fragment and query",
		fixtures,
		"./main1.js#fragment?query",
		path.join(fixtures, "main1.js") + "#fragment?query"
	);
	testResolve(
		"file with query and fragment",
		fixtures,
		"./main1.js?#fragment",
		path.join(fixtures, "main1.js") + "?#fragment"
	);

	testResolve(
		"file in module with query",
		fixtures,
		"m1/a?query",
		path.join(fixtures, "node_modules", "m1", "a.js") + "?query"
	);
	testResolve(
		"file in module with fragment",
		fixtures,
		"m1/a#fragment",
		path.join(fixtures, "node_modules", "m1", "a.js") + "#fragment"
	);
	testResolve(
		"file in module with fragment and query",
		fixtures,
		"m1/a#fragment?query",
		path.join(fixtures, "node_modules", "m1", "a.js") + "#fragment?query"
	);
	testResolve(
		"file in module with query and fragment",
		fixtures,
		"m1/a?#fragment",
		path.join(fixtures, "node_modules", "m1", "a.js") + "?#fragment"
	);

	testResolveContext("context for fixtures", fixtures, "./", fixtures);
	testResolveContext(
		"context for fixtures/lib",
		fixtures,
		"./lib",
		path.join(fixtures, "lib")
	);
	testResolveContext(
		"context for fixtures with ..",
		fixtures,
		"./lib/../../fixtures/./lib/..",
		fixtures
	);

	testResolveContext(
		"context for fixtures with query",
		fixtures,
		"./?query",
		fixtures + "?query"
	);

	testResolve(
		"differ between directory and file, resolve file",
		fixtures,
		"./dirOrFile",
		path.join(fixtures, "dirOrFile.js")
	);
	testResolve(
		"differ between directory and file, resolve directory",
		fixtures,
		"./dirOrFile/",
		path.join(fixtures, "dirOrFile", "index.js")
	);

	testResolve(
		"find node_modules outside of node_modules",
		path.join(fixtures, "browser-module", "node_modules"),
		"m1/a",
		path.join(fixtures, "node_modules", "m1", "a.js")
	);

	testResolve(
		"don't crash on main field pointing to self",
		fixtures,
		"./main-field-self",
		path.join(fixtures, "main-field-self", "index.js")
	);

	testResolve(
		"don't crash on main field pointing to self",
		fixtures,
		"./main-field-self2",
		path.join(fixtures, "main-field-self2", "index.js")
	);

	testResolve(
		"handle fragment edge case (no fragment)",
		fixtures,
		"./no#fragment/#/#",
		path.join(fixtures, "no\0#fragment/\0#", "\0#.js")
	);

	testResolve(
		"handle fragment edge case (fragment)",
		fixtures,
		"./no#fragment/#/",
		path.join(fixtures, "no.js") + "#fragment/#/"
	);

	testResolve(
		"handle fragment escaping",
		fixtures,
		"./no\0#fragment/\0#/\0##fragment",
		path.join(fixtures, "no\0#fragment/\0#", "\0#.js") + "#fragment"
	);

	it("should correctly resolve", function (done) {
		const issue238 = path.resolve(fixtures, "issue-238");

		issue238Resolve(
			path.resolve(issue238, "./src/common"),
			"config/myObjectFile",
			function (err, filename) {
				if (err) done(err);
				should.exist(filename);
				filename.should.equal(
					path.resolve(issue238, "./src/common/config/myObjectFile.js")
				);
				done();
			}
		);
	});

	it("should correctly resolve with preferRelative", function (done) {
		preferRelativeResolve(fixtures, "main1.js", function (err, filename) {
			if (err) done(err);
			should.exist(filename);
			filename.should.equal(path.join(fixtures, "main1.js"));
			done();
		});
	});

	it("should correctly resolve with preferRelative", function (done) {
		preferRelativeResolve(fixtures, "m1/a.js", function (err, filename) {
			if (err) done(err);
			should.exist(filename);
			filename.should.equal(path.join(fixtures, "node_modules", "m1", "a.js"));
			done();
		});
	});

	it("should not crash when passing undefined as path", done => {
		resolve(fixtures, undefined, err => {
			err.should.be.instanceof(Error);
			done();
		});
	});

	it("should not crash when passing undefined as context", done => {
		resolve({}, undefined, "./test/resolve.js", err => {
			err.should.be.instanceof(Error);
			done();
		});
	});

	it("should not crash when passing undefined everywere", done => {
		resolve(undefined, undefined, undefined, undefined, err => {
			err.should.be.instanceof(Error);
			done();
		});
	});
});
