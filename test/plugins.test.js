"use strict";

const path = require("path");
const { ResolverFactory, CloneBasenamePlugin } = require("../");

describe("plugins", function () {
	it("should resolve with the CloneBasenamePlugin", (done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: require("fs"),
			plugins: [
				new CloneBasenamePlugin(
					"after-existing-directory",
					"undescribed-raw-file"
				)
			]
		});

		resolver.resolve(
			{},
			__dirname,
			"./fixtures/directory-default",
			{},
			function (err, result) {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				expect(result).toEqual(
					path.resolve(
						__dirname,
						"fixtures/directory-default/directory-default.js"
					)
				);
				done();
			}
		);
	});

	it("should ignore 'false'/'null'/'undefined' plugins", (done) => {
		const FailedPlugin = class {
			apply() {
				throw new Error("FailedPlugin");
			}
		};
		const falsy = false;
		const resolver = ResolverFactory.createResolver({
			fileSystem: require("fs"),
			plugins: [
				0,
				"",
				false,
				null,
				undefined,
				falsy && new FailedPlugin(),
				new CloneBasenamePlugin(
					"after-existing-directory",
					"undescribed-raw-file"
				)
			]
		});

		resolver.resolve(
			{},
			__dirname,
			"./fixtures/directory-default",
			{},
			function (err, result) {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				expect(result).toEqual(
					path.resolve(
						__dirname,
						"fixtures/directory-default/directory-default.js"
					)
				);
				done();
			}
		);
	});
});
