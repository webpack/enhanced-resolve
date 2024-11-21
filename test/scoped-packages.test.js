const path = require("path");
const fs = require("fs");
const { CachedInputFileSystem, ResolverFactory } = require("../");
const { transferPathToPosix, obps } = require("./util/path-separator");

const fixture = path.join(__dirname, "fixtures", "scoped");

const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

const resolver = ResolverFactory.createResolver({
	aliasFields: ["browser"],
	fileSystem: nodeFileSystem
});

describe("scoped-packages", () => {
	it("main field should work", done => {
		resolver.resolve({}, fixture, `@scope${obps}pack1`, {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				transferPathToPosix(
					path.resolve(
						fixture,
						`.${obps}node_modules${obps}@scope${obps}pack1${obps}main.js`
					)
				)
			);
			done();
		});
	});

	it("browser field should work", done => {
		resolver.resolve({}, fixture, `@scope${obps}pack2`, {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				transferPathToPosix(
					path.resolve(
						fixture,
						`.${obps}node_modules${obps}@scope${obps}pack2${obps}main.js`
					)
				)
			);
			done();
		});
	});

	it("folder request should work", done => {
		resolver.resolve(
			{},
			fixture,
			`@scope${obps}pack2${obps}lib`,
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				expect(result).toEqual(
					transferPathToPosix(
						path.resolve(
							fixture,
							`.${obps}node_modules${obps}@scope${obps}pack2${obps}lib${obps}index.js`
						)
					)
				);
				done();
			}
		);
	});
});
