require("should");
const path = require("path");
const fs = require("fs");
const ResolverFactory = require("../lib/ResolverFactory");
const CachedInputFileSystem = require("../lib/CachedInputFileSystem");

const fixture = path.resolve(__dirname, "fixtures", "restrictions");
const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

describe("restrictions", () => {
	it("should respect RegExp restriction", done => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			fileSystem: nodeFileSystem,
			restrictions: [/\.(sass|scss|css)$/]
		});

		resolver.resolve({}, fixture, "pck1", {}, (err, result) => {
			if (!err) throw new Error(`expect error, got ${result}`);
			err.should.be.instanceof(Error);
			done();
		});
	});

	it("should try to find alternative #1", done => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js", ".css"],
			fileSystem: nodeFileSystem,
			mainFiles: ["index"],
			restrictions: [/\.(sass|scss|css)$/]
		});

		resolver.resolve({}, fixture, "pck1", {}, (err, result) => {
			if (err) return done(err);
			if (!result) throw new Error("No result");
			result.should.equal(path.resolve(fixture, "node_modules/pck1/index.css"));
			done();
		});
	});

	it("should respect string restriction", done => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			fileSystem: nodeFileSystem,
			restrictions: [fixture]
		});

		resolver.resolve({}, fixture, "pck2", {}, (err, result) => {
			if (!err) throw new Error(`expect error, got ${result}`);
			err.should.be.instanceof(Error);
			done();
		});
	});

	it("should try to find alternative #2", done => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			fileSystem: nodeFileSystem,
			mainFields: ["main", "style"],
			restrictions: [fixture, /\.(sass|scss|css)$/]
		});

		resolver.resolve({}, fixture, "pck2", {}, (err, result) => {
			if (err) return done(err);
			if (!result) throw new Error("No result");
			result.should.equal(path.resolve(fixture, "node_modules/pck2/index.css"));
			done();
		});
	});

	it("should try to find alternative #3", done => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			fileSystem: nodeFileSystem,
			mainFields: ["main", "module", "style"],
			restrictions: [fixture, /\.(sass|scss|css)$/]
		});

		const log = [];

		resolver.resolve(
			{},
			fixture,
			"pck2",
			{ log: log.push.bind(log) },
			(err, result) => {
				if (err) return done(err);
				if (!result) throw new Error("No result");
				result.should.equal(
					path.resolve(fixture, "node_modules/pck2/index.css")
				);
				log
					.map(line =>
						line
							.replace(path.resolve(__dirname, ".."), "...")
							.replace(path.resolve(__dirname, ".."), "...")
							.replace(/\\/g, "/")
					)
					.should.be.eql([
						"resolve 'pck2' in '.../test/fixtures/restrictions'",
						"  Parsed request is a module",
						"  using description file: .../package.json (relative path: ./test/fixtures/restrictions)",
						"    resolve as module",
						"      looking for modules in .../test/fixtures/restrictions/node_modules",
						"        single file module",
						"          using description file: .../package.json (relative path: ./test/fixtures/restrictions/node_modules/pck2)",
						"            no extension",
						"              .../test/fixtures/restrictions/node_modules/pck2 is not a file",
						"            .js",
						"              .../test/fixtures/restrictions/node_modules/pck2.js doesn't exist",
						"        existing directory .../test/fixtures/restrictions/node_modules/pck2",
						"          using description file: .../test/fixtures/restrictions/node_modules/pck2/package.json (relative path: .)",
						"            using description file: .../package.json (relative path: ./test/fixtures/restrictions/node_modules/pck2)",
						"              no extension",
						"                .../test/fixtures/restrictions/node_modules/pck2 is not a file",
						"              .js",
						"                .../test/fixtures/restrictions/node_modules/pck2.js doesn't exist",
						"              as directory",
						"                existing directory .../test/fixtures/restrictions/node_modules/pck2",
						"                  using description file: .../test/fixtures/restrictions/node_modules/pck2/package.json (relative path: .)",
						"                    use ../../../c.js from main in package.json",
						"                      using description file: .../package.json (relative path: ./test/fixtures/c.js)",
						"                        no extension",
						"                          existing file: .../test/fixtures/c.js",
						"                            .../test/fixtures/c.js is not inside of the restriction .../test/fixtures/restrictions",
						"                        .js",
						"                          .../test/fixtures/c.js.js doesn't exist",
						"                        as directory",
						"                          .../test/fixtures/c.js is not a directory",
						"                    use ./module.js from module in package.json",
						"                      using description file: .../test/fixtures/restrictions/node_modules/pck2/package.json (relative path: ./module.js)",
						"                        no extension",
						"                          existing file: .../test/fixtures/restrictions/node_modules/pck2/module.js",
						"                            .../test/fixtures/restrictions/node_modules/pck2/module.js doesn't match the restriction //.(sass|scss|css)$/",
						"                        .js",
						"                          .../test/fixtures/restrictions/node_modules/pck2/module.js.js doesn't exist",
						"                        as directory",
						"                          .../test/fixtures/restrictions/node_modules/pck2/module.js is not a directory",
						"                    use ./index.css from style in package.json",
						"                      using description file: .../test/fixtures/restrictions/node_modules/pck2/package.json (relative path: ./index.css)",
						"                        no extension",
						"                          existing file: .../test/fixtures/restrictions/node_modules/pck2/index.css",
						"                            reporting result .../test/fixtures/restrictions/node_modules/pck2/index.css"
					]);
				done();
			}
		);
	});
});
