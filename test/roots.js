require("should");
const path = require("path");
const fs = require("fs");
const ResolverFactory = require("../lib/ResolverFactory");
const CachedInputFileSystem = require("../lib/CachedInputFileSystem");

describe("roots", () => {
	const fixtures = path.resolve(__dirname, "fixtures");
	const resolver = ResolverFactory.createResolver({
		extensions: [".js"],
		alias: {
			foo: "/fixtures"
		},
		roots: [__dirname, fixtures],
		fileSystem: new CachedInputFileSystem(fs, 4000)
	});

	it("should respect roots option", done => {
		resolver.resolve({}, fixtures, "/fixtures/b.js", {}, (err, result) => {
			if (err) return done(err);
			if (!result) throw new Error("No result");
			result.should.equal(path.resolve(fixtures, "b.js"));
			done();
		});
	});

	it("should try another root option, if it exists", done => {
		resolver.resolve({}, fixtures, "/b.js", {}, (err, result) => {
			if (err) return done(err);
			if (!result) throw new Error("No result");
			result.should.equal(path.resolve(fixtures, "b.js"));
			done();
		});
	});

	it("should respect extension", done => {
		resolver.resolve({}, fixtures, "/fixtures/b", {}, (err, result) => {
			if (err) return done(err);
			if (!result) throw new Error("No result");
			result.should.equal(path.resolve(fixtures, "b.js"));
			done();
		});
	});

	it("should respect aliases", done => {
		resolver.resolve({}, fixtures, "foo/b", {}, (err, result) => {
			if (err) return done(err);
			if (!result) throw new Error("No result");
			result.should.equal(path.resolve(fixtures, "b.js"));
			done();
		});
	});

	it("should not work with relative path", done => {
		resolver.resolve({}, fixtures, "fixtures/b.js", {}, (err, result) => {
			if (!err) throw new Error(`expect error, got ${result}`);
			err.should.be.instanceof(Error);
			done();
		});
	});
});
