const should = require("should");

const { ResolverFactory } = require("../");
const { Volume } = require("memfs");

/** @typedef {import("../lib/Resolver").ResolveContext} ResolveContext */
/** @typedef {ResolveContext & Required<Pick<ResolveContext, 'yield' | 'fileDependencies' | 'contextDependencies' | 'missingDependencies'>>} StrictResolveContext */

const fileSystem = Volume.fromJSON(
	{
		"/a/foo/a": "",
		"/a/foo/b": "",
		"/a/foo-2/b": "",
		"/a/foo-2/c": "",
		"/b/foo/a": ""
	},
	"/"
);

describe("should resolve all aliases", () => {
	const resolver = ResolverFactory.createResolver({
		extensions: [".js"],
		alias: {
			index: ["/a/foo", "/a/foo-2"]
		},
		modules: "/",
		fileSystem
	});
	const modulesResolver = ResolverFactory.createResolver({
		extensions: [".js"],
		modules: ["a", "b"],
		fileSystem
	});

	it("should yield all b files", done => {
		const paths = [];
		const yield_ = ({ path }) => paths.push(path);
		const fileDependencies = new Set();
		const contextDependencies = new Set();
		const missingDependencies = new Set();
		/** @type {ResolveContext} */
		const context = {
			yield: yield_,
			fileDependencies,
			contextDependencies,
			missingDependencies
		};

		resolver.resolve({}, "/", "index/b", context, (err, result) => {
			should(err).be.eql(null);
			should(result).be.eql(undefined);
			should(paths).be.eql(["/a/foo/b", "/a/foo-2/b"]);
			should(Array.from(fileDependencies.values()).sort()).be.eql([
				"/",
				"/a",
				"/a/foo",
				"/a/foo-2",
				"/a/foo-2/b",
				"/a/foo/b"
			]);
			should(Array.from(missingDependencies.values()).sort()).be.eql([
				"/a/foo-2/b",
				"/a/foo-2/b.js",
				"/a/foo-2/package.json",
				"/a/foo/b",
				"/a/foo/b.js",
				"/a/foo/package.json",
				"/a/package.json",
				"/package.json"
			]);
			should(Array.from(contextDependencies.values()).sort()).be.eql([]);
			done();
		});
	});

	it("should yield all foo files", done => {
		const paths = [];
		const yield_ = ({ path }) => paths.push(path);
		const fileDependencies = new Set();
		const contextDependencies = new Set();
		const missingDependencies = new Set();
		/** @type {ResolveContext} */
		const context = {
			yield: yield_,
			fileDependencies,
			contextDependencies,
			missingDependencies
		};

		modulesResolver.resolve({}, "/", "foo/a", context, (err, result) => {
			should(err).be.eql(null);
			should(result).be.eql(undefined);
			should(paths).be.eql(["/a/foo/a", "/b/foo/a"]);
			should(Array.from(fileDependencies.values()).sort()).be.eql([
				"/",
				"/a",
				"/a/foo",
				"/a/foo/a",
				"/b",
				"/b/foo",
				"/b/foo/a"
			]);
			should(Array.from(missingDependencies.values()).sort()).be.eql([
				"/a/foo/a",
				"/a/foo/a.js",
				"/a/foo/package.json",
				"/a/package.json",
				"/b/foo/a",
				"/b/foo/a.js",
				"/b/foo/package.json",
				"/b/package.json",
				"/package.json"
			]);
			should(Array.from(contextDependencies.values()).sort()).be.eql([]);
			done();
		});
	});

	it("should yield c file", done => {
		const paths = [];
		const yield_ = ({ path }) => paths.push(path);
		/** @type {ResolveContext} */
		const context = {
			yield: yield_
		};

		resolver.resolve({}, "/", "index/c", context, (err, result) => {
			should(err).be.eql(null);
			should(result).be.eql(undefined);
			should(paths).be.eql(["/a/foo-2/c"]);
			done();
		});
	});

	it("should return error if no resolve", done => {
		const paths = [];
		const yield_ = ({ path }) => paths.push(path);
		const fileDependencies = new Set();
		const contextDependencies = new Set();
		const missingDependencies = new Set();
		/** @type {ResolveContext} */
		const context = {
			yield: yield_,
			fileDependencies,
			contextDependencies,
			missingDependencies
		};

		resolver.resolve({}, "/", "index/unknown", context, (err, result) => {
			should(err).not.be.eql(null);
			should(err).not.be.eql(undefined);
			should(result).be.eql(undefined);
			should(paths).be.eql([]);
			should(Array.from(fileDependencies.values()).sort()).be.eql([]);
			should(Array.from(missingDependencies.values()).sort()).be.eql([
				"/a/foo-2/package.json",
				"/a/foo-2/unknown",
				"/a/foo-2/unknown.js",
				"/a/foo/package.json",
				"/a/foo/unknown",
				"/a/foo/unknown.js",
				"/a/package.json",
				"/package.json"
			]);
			should(Array.from(contextDependencies.values()).sort()).be.eql([]);
			done();
		});
	});
});
