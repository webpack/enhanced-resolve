const path = require("path");
const fs = require("fs");
const ResolverFactory = require("../lib/ResolverFactory");
const CachedInputFileSystem = require("../lib/CachedInputFileSystem");

const fixture = path.resolve(__dirname, "fixtures", "style");

describe("StyleFieldPlugin", () => {
	const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

	const resolver = ResolverFactory.createResolver({
		fileSystem: nodeFileSystem
	});

	it("should resolve style field", done => {
		resolver.resolve(
			{
				issuer: path.resolve(fixture, "style.css")
			},
			fixture,
			"style-library",
			{},
			(err, result) => {
				console.log(
					"🚀 ~ file: styleField.test.js:17 ~ resolver.resolve ~ err, result:",
					err,
					result
				);
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				expect(result).toEqual(
					path.resolve(fixture, "node_modules/style-library/style.css")
				);
				done();
			}
		);
	});

	it("should not resolve to style field if request is not coming from a css file", done => {
		resolver.resolve(
			{
				issuer: path.resolve(fixture, "index.js")
			},
			fixture,
			"style-library",
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				expect(result).toEqual(
					path.resolve(fixture, "node_modules/style-library/main.js")
				);
				done();
			}
		);
	});
});
