"use strict";

const ResolverFactory = require("../").ResolverFactory;
const CloneBasenamePlugin = require("../lib/CloneBasenamePlugin");
const path = require("path");

describe("plugins", function() {
	it("should resolve with the CloneBasenamePlugin", function(done) {
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
			function(err, result) {
				if (err) return done(err);
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
