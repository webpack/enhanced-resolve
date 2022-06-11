const should = require("should");

const path = require("path");
const { ResolverFactory } = require("../");
const CachedInputFileSystem = require("../lib/CachedInputFileSystem");
const fs = require("fs");

const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

describe("description-file", () => {
	let resolver;
	beforeEach(() => {
		resolver = ResolverFactory.createResolver({
			modules: "fixtures",
			fileSystem: nodeFileSystem
		});
	});

	it("description file data should have version and name if possible #1", done => {
		resolver.resolve(
			{},
			__dirname,
			"description-files/dir/dir1/index",
			{},
			(err, result, resultContext) => {
				if (err) return done(err);
				should(resultContext.descriptionFileData.type).be.eql("module");
				should(resultContext.descriptionFileData.name).be.eql(
					"description-files"
				);
				should(resultContext.descriptionFileData.version).be.eql("1.0.0");
				should(resultContext.descriptionFileData.sideEffects).be.eql(false);
				should(
					resultContext.descriptionFileData._parentDescriptionFileRoot
				).be.eql(path.join(__dirname, "fixtures", "description-files"));
				done();
			}
		);
	});

	it("description file data should have version and name if possible #2", done => {
		resolver.resolve(
			{},
			__dirname,
			"description-files",
			{},
			(err, result, resultContext) => {
				if (err) return done(err);
				should(resultContext.descriptionFileData.name).be.eql(
					"description-files"
				);
				should(resultContext.descriptionFileData.version).be.eql("1.0.0");
				done();
			}
		);
	});
});
