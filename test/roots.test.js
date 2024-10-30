const path = require("path");
const fs = require("fs");
const ResolverFactory = require("../lib/ResolverFactory");
const CachedInputFileSystem = require("../lib/CachedInputFileSystem");
const {
	posixSep,
	transferPathToPosix,
	obps
} = require("./util/path-separator");

describe("roots", () => {
	const fixtures = path.resolve(__dirname, "fixtures");
	const fileSystem = new CachedInputFileSystem(fs, 4000);
	const resolver = ResolverFactory.createResolver({
		extensions: [".js"],
		alias: {
			foo: `${obps}fixtures`
		},
		roots: [__dirname, fixtures],
		fileSystem
	});

	const resolverPreferAbsolute = ResolverFactory.createResolver({
		extensions: [".js"],
		alias: {
			foo: `${obps}fixtures`
		},
		roots: [__dirname, fixtures],
		fileSystem,
		preferAbsolute: true,
		plugins: [
			{
				apply(resolver) {
					resolver.hooks.file.tap("Test", request => {
						if (/test.fixtures.*test.fixtures/.test(request.path))
							throw new Error("Simulate a fatal error in root path");
					});
				}
			}
		]
	});

	const contextResolver = ResolverFactory.createResolver({
		roots: [__dirname],
		fileSystem,
		resolveToContext: true
	});

	it("should respect roots option", done => {
		resolver.resolve(
			{},
			fixtures,
			`${obps}fixtures${obps}b.js`,
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				expect(result).toEqual(
					transferPathToPosix(path.resolve(fixtures, "b.js"))
				);
				done();
			}
		);
	});

	it("should try another root option, if it exists", done => {
		resolver.resolve({}, fixtures, `${obps}b.js`, {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				transferPathToPosix(path.resolve(fixtures, "b.js"))
			);
			done();
		});
	});

	it("should respect extension", done => {
		resolver.resolve(
			{},
			fixtures,
			`${obps}fixtures${obps}b`,
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				expect(result).toEqual(
					transferPathToPosix(path.resolve(fixtures, "b.js"))
				);
				done();
			}
		);
	});

	it("should resolve in directory", done => {
		resolver.resolve(
			{},
			fixtures,
			`${obps}fixtures${obps}extensions${obps}dir`,
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				expect(result).toEqual(
					transferPathToPosix(
						path.resolve(
							fixtures,
							`extensions${posixSep}dir${posixSep}index.js`
						)
					)
				);
				done();
			}
		);
	});

	it("should respect aliases", done => {
		resolver.resolve({}, fixtures, `foo${obps}b`, {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				transferPathToPosix(path.resolve(fixtures, "b.js"))
			);
			done();
		});
	});

	it("should support roots options with resolveToContext", done => {
		contextResolver.resolve(
			{},
			fixtures,
			`${obps}fixtures${obps}lib`,
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				expect(result).toEqual(
					transferPathToPosix(path.resolve(fixtures, "lib"))
				);
				done();
			}
		);
	});

	it("should not work with relative path", done => {
		resolver.resolve({}, fixtures, `fixtures${obps}b.js`, {}, (err, result) => {
			if (!err) return done(new Error(`expect error, got ${result}`));
			expect(err).toBeInstanceOf(Error);
			done();
		});
	});

	it("should resolve an absolute path (prefer absolute)", done => {
		resolverPreferAbsolute.resolve(
			{},
			fixtures,
			path.join(fixtures, "b.js"),
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				expect(result).toEqual(
					transferPathToPosix(path.resolve(fixtures, "b.js"))
				);
				done();
			}
		);
	});
});
