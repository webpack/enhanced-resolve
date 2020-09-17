"use strict";

require("should");

const path = require("path");
const { ResolverFactory, CloneBasenamePlugin } = require("../");

describe("plugins", function () {
	it("should resolve with the CloneBasenamePlugin", function (done) {
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
				if (!result) throw new Error("No result");
				result.should.be.eql(
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
