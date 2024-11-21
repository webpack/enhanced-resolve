const path = require("path");
const resolve = require("../");
const {
	posixSep,
	transferPathToPosix,
	obps
} = require("./util/path-separator");

const fixtures = path.join(__dirname, "fixtures");

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
	modules: [`src${obps}a`, `src${obps}b`, `src${obps}common`, "node_modules"]
});

const preferRelativeResolve = resolve.create({
	preferRelative: true
});

function testResolve(name, context, moduleName, result) {
	describe(name, () => {
		it("should resolve sync correctly", () => {
			const filename = resolve.sync(context, moduleName);
			expect(filename).toBeDefined();
			expect(filename).toEqual(transferPathToPosix(result));
		});
		it("should resolve async correctly", function (done) {
			resolve(context, moduleName, function (err, filename) {
				if (err) return done(err);
				expect(filename).toBeDefined();
				expect(filename).toEqual(transferPathToPosix(result));
				done();
			});
		});
	});
}

function testResolveContext(name, context, moduleName, result) {
	describe(name, () => {
		it("should resolve async correctly", function (done) {
			asyncContextResolve(context, moduleName, function (err, filename) {
				if (err) done(err);
				expect(filename).toBeDefined();
				expect(filename).toEqual(transferPathToPosix(result));
				done();
			});
		});
		it("should resolve sync correctly", () => {
			const filename = syncContextResolve(context, moduleName);
			expect(filename).toBeDefined();
			expect(filename).toEqual(transferPathToPosix(result));
		});
	});
}
describe("resolve", () => {
	testResolve(
		"absolute path",
		fixtures,
		path.join(fixtures, "main1.js"),
		path.join(fixtures, "main1.js")
	);

	testResolve(
		"file with .js",
		fixtures,
		`.${obps}main1.js`,
		path.join(fixtures, "main1.js")
	);
	testResolve(
		"file without extension",
		fixtures,
		`.${obps}main1`,
		path.join(fixtures, "main1.js")
	);
	testResolve(
		"another file with .js",
		fixtures,
		`.${obps}a.js`,
		path.join(fixtures, "a.js")
	);
	testResolve(
		"another file without extension",
		fixtures,
		`.${obps}a`,
		path.join(fixtures, "a.js")
	);
	testResolve(
		"file in module with .js",
		fixtures,
		`m1${obps}a.js`,
		path.join(fixtures, "node_modules", "m1", "a.js")
	);
	testResolve(
		"file in module without extension",
		fixtures,
		`m1${obps}a`,
		path.join(fixtures, "node_modules", "m1", "a.js")
	);
	testResolve(
		"another file in module without extension",
		fixtures,
		`complexm${obps}step1`,
		path.join(fixtures, "node_modules", "complexm", "step1.js")
	);
	testResolve(
		"from submodule to file in sibling module",
		path.join(fixtures, "node_modules", "complexm"),
		`m2${obps}b.js`,
		path.join(fixtures, "node_modules", "m2", "b.js")
	);
	testResolve(
		"from submodule to file in sibling of parent module",
		path.join(fixtures, "node_modules", "complexm", "web_modules", "m1"),
		`m2${obps}b.js`,
		path.join(fixtures, "node_modules", "m2", "b.js")
	);
	testResolve(
		"from nested directory to overwritten file in module",
		path.join(fixtures, "multiple_modules"),
		`m1${obps}a.js`,
		path.join(fixtures, "multiple_modules", "node_modules", "m1", "a.js")
	);
	testResolve(
		"from nested directory to not overwritten file in module",
		path.join(fixtures, "multiple_modules"),
		`m1${obps}b.js`,
		path.join(fixtures, "node_modules", "m1", "b.js")
	);

	testResolve(
		"file with query",
		fixtures,
		`.${obps}main1.js?query`,
		path.join(fixtures, "main1.js") + "?query"
	);
	testResolve(
		"file with fragment",
		fixtures,
		`.${obps}main1.js#fragment`,
		path.join(fixtures, "main1.js") + "#fragment"
	);
	testResolve(
		"file with fragment and query",
		fixtures,
		`.${obps}main1.js#fragment?query`,
		path.join(fixtures, "main1.js") + "#fragment?query"
	);
	testResolve(
		"file with query and fragment",
		fixtures,
		`.${obps}main1.js?#fragment`,
		path.join(fixtures, "main1.js") + "?#fragment"
	);

	testResolve(
		"file in module with query",
		fixtures,
		`m1${obps}a?query`,
		path.join(fixtures, "node_modules", "m1", "a.js") + "?query"
	);
	testResolve(
		"file in module with fragment",
		fixtures,
		`m1${obps}a#fragment`,
		path.join(fixtures, "node_modules", "m1", "a.js") + "#fragment"
	);
	testResolve(
		"file in module with fragment and query",
		fixtures,
		`m1${obps}a#fragment?query`,
		path.join(fixtures, "node_modules", "m1", "a.js") + "#fragment?query"
	);
	testResolve(
		"file in module with query and fragment",
		fixtures,
		`m1${obps}a?#fragment`,
		path.join(fixtures, "node_modules", "m1", "a.js") + "?#fragment"
	);

	testResolveContext("context for fixtures", fixtures, `.${obps}`, fixtures);
	testResolveContext(
		`context for fixtures${obps}lib`,
		fixtures,
		`.${obps}lib`,
		path.join(fixtures, "lib")
	);
	testResolveContext(
		"context for fixtures with ..",
		fixtures,
		`.${obps}lib${obps}..${obps}..${obps}fixtures${obps}.${obps}lib${obps}..`,
		fixtures
	);

	testResolveContext(
		"context for fixtures with query",
		fixtures,
		`.${obps}?query`,
		fixtures + "?query"
	);

	testResolve(
		"differ between directory and file, resolve file",
		fixtures,
		`.${obps}dirOrFile`,
		path.join(fixtures, "dirOrFile.js")
	);
	testResolve(
		"differ between directory and file, resolve directory",
		fixtures,
		`.${obps}dirOrFile${obps}`,
		path.join(fixtures, "dirOrFile", "index.js")
	);

	testResolve(
		"find node_modules outside of node_modules",
		path.join(fixtures, "browser-module", "node_modules"),
		`m1${obps}a`,
		path.join(fixtures, "node_modules", "m1", "a.js")
	);

	testResolve(
		"don't crash on main field pointing to self",
		fixtures,
		`.${obps}main-field-self`,
		path.join(fixtures, "main-field-self", "index.js")
	);

	testResolve(
		"don't crash on main field pointing to self",
		fixtures,
		`.${obps}main-field-self2`,
		path.join(fixtures, "main-field-self2", "index.js")
	);

	testResolve(
		"handle fragment edge case (no fragment)",
		fixtures,
		`.${obps}no#fragment${obps}#${obps}#`,
		path.join(fixtures, `no #fragment${posixSep} #`, "\0#.js")
	);

	testResolve(
		"handle fragment edge case (fragment)",
		fixtures,
		`.${obps}no#fragment${obps}#${obps}`,
		path.join(fixtures, "no.js") + `#fragment${posixSep}#${posixSep}`
	);

	testResolve(
		"handle fragment escaping",
		fixtures,
		`.${obps}no #fragment${obps} #${obps} ##fragment`,
		path.join(fixtures, `no #fragment${posixSep} #`, "\0#.js") + "#fragment"
	);

	it("should correctly resolve", function (done) {
		const issue238 = path.resolve(fixtures, "issue-238");

		issue238Resolve(
			path.resolve(issue238, `.${obps}src${obps}common`),
			`config${obps}myObjectFile`,
			function (err, filename) {
				if (err) done(err);
				expect(filename).toBeDefined();
				expect(filename).toEqual(
					transferPathToPosix(
						path.resolve(
							issue238,
							`.${posixSep}src${posixSep}common${posixSep}config${posixSep}myObjectFile.js`
						)
					)
				);
				done();
			}
		);
	});

	it("should correctly resolve with preferRelative", function (done) {
		preferRelativeResolve(fixtures, "main1.js", function (err, filename) {
			if (err) done(err);
			expect(filename).toBeDefined();
			expect(filename).toEqual(
				transferPathToPosix(path.join(fixtures, "main1.js"))
			);
			done();
		});
	});

	it("should correctly resolve with preferRelative", function (done) {
		preferRelativeResolve(fixtures, `m1${obps}a.js`, function (err, filename) {
			if (err) done(err);
			expect(filename).toBeDefined();
			expect(filename).toEqual(
				transferPathToPosix(path.join(fixtures, "node_modules", "m1", "a.js"))
			);
			done();
		});
	});

	it("should not crash when passing undefined as path", done => {
		// @ts-expect-error testing invalid arguments
		resolve(fixtures, undefined, err => {
			expect(err).toBeInstanceOf(Error);
			done();
		});
	});

	it("should not crash when passing undefined as context", done => {
		// @ts-expect-error testing invalid arguments
		resolve({}, undefined, `.${obps}test${obps}resolve.js`, err => {
			expect(err).toBeInstanceOf(Error);
			done();
		});
	});

	it("should not crash when passing undefined everywhere", done => {
		// @ts-expect-error testing invalid arguments
		resolve(undefined, undefined, undefined, undefined, err => {
			expect(err).toBeInstanceOf(Error);
			done();
		});
	});
});
