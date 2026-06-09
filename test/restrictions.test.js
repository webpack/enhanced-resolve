"use strict";

const fs = require("fs");
const path = require("path");
const CachedInputFileSystem = require("../lib/CachedInputFileSystem");
const ResolverFactory = require("../lib/ResolverFactory");

const fixture = path.resolve(__dirname, "fixtures", "restrictions");
const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

describe("restrictions", () => {
	it("should respect RegExp restriction", (done) => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			fileSystem: nodeFileSystem,
			restrictions: [/\.(sass|scss|css)$/],
		});

		resolver.resolve({}, fixture, "pck1", {}, (err, result) => {
			if (!err) return done(new Error(`expect error, got ${result}`));
			expect(err).toBeInstanceOf(Error);
			done();
		});
	});

	it("should try to find alternative #1", (done) => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js", ".css"],
			fileSystem: nodeFileSystem,
			mainFiles: ["index"],
			restrictions: [/\.(sass|scss|css)$/],
		});

		resolver.resolve({}, fixture, "pck1", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				path.resolve(fixture, "node_modules/pck1/index.css"),
			);
			done();
		});
	});

	it("should respect string restriction", (done) => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			fileSystem: nodeFileSystem,
			restrictions: [fixture],
		});

		resolver.resolve({}, fixture, "pck2", {}, (err, result) => {
			if (!err) return done(new Error(`expect error, got ${result}`));
			expect(err).toBeInstanceOf(Error);
			done();
		});
	});

	it("should try to find alternative #2", (done) => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			fileSystem: nodeFileSystem,
			mainFields: ["main", "style"],
			restrictions: [fixture, /\.(sass|scss|css)$/],
		});

		resolver.resolve({}, fixture, "pck2", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				path.resolve(fixture, "node_modules/pck2/index.css"),
			);
			done();
		});
	});

	it("should try to find alternative #3", (done) => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			fileSystem: nodeFileSystem,
			mainFields: ["main", "module", "style"],
			restrictions: [fixture, /\.(sass|scss|css)$/],
		});

		const log = [];

		resolver.resolve(
			{},
			fixture,
			"pck2",
			{ log: log.push.bind(log) },
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				expect(result).toEqual(
					path.resolve(fixture, "node_modules/pck2/index.css"),
				);
				expect(
					log.map((line) =>
						line
							.replace(path.resolve(__dirname, ".."), "...")
							.replace(path.resolve(__dirname, ".."), "...")
							.replace(/\\/g, "/"),
					),
				).toEqual([
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
					"                            reporting result .../test/fixtures/restrictions/node_modules/pck2/index.css",
				]);
				done();
			},
		);
	});

	it("should fall back to the next modules entry when an exports target is outside the restriction", (done) => {
		const buildModules = path.resolve(fixture, "build/node_modules");
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			modules: ["node_modules", buildModules],
			restrictions: [buildModules],
		});

		resolver.resolve(
			{},
			fixture,
			"exports-pck",
			{},
			(err, result, resolveRequest) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				expect(result).toEqual(
					path.resolve(buildModules, "exports-pck/lib/index.js"),
				);
				// the internal carrier must not leak onto the result
				expect(resolveRequest).not.toHaveProperty("__restrictionsMarker");
				done();
			},
		);
	});

	it("should fall back when an exports target fails a RegExp restriction", (done) => {
		const buildModules = path.resolve(fixture, "build/node_modules");
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			modules: ["node_modules", buildModules],
			restrictions: [/[\\/]build[\\/]node_modules[\\/]/],
		});

		resolver.resolve({}, fixture, "exports-pck", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				path.resolve(buildModules, "exports-pck/lib/index.js"),
			);
			done();
		});
	});

	it("should not leak the internal marker when restrictions are not configured", (done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			modules: ["node_modules"],
		});

		resolver.resolve(
			{},
			fixture,
			"exports-pck",
			{},
			(err, result, resolveRequest) => {
				if (err) return done(err);
				expect(result).toEqual(
					path.resolve(fixture, "node_modules/exports-pck/lib/index.js"),
				);
				expect(resolveRequest).not.toHaveProperty("__restrictionsMarker");
				done();
			},
		);
	});

	it("should still throw when an exports target has no in-restriction fallback", (done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			modules: ["node_modules"],
			restrictions: [path.resolve(fixture, "build/node_modules")],
		});

		resolver.resolve({}, fixture, "exports-pck", {}, (err, result) => {
			if (!err) return done(new Error(`expect error, got ${result}`));
			expect(err).toBeInstanceOf(Error);
			done();
		});
	});

	it("should throw an error when the path is outside a string restriction", (done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			extensions: [".js"],
			restrictions: ["/definitely/not/here"],
		});
		const log = [];
		resolver.resolve(
			{},
			fixture,
			"pck1",
			{ log: (m) => log.push(m) },
			(err) => {
				expect(err).toBeInstanceOf(Error);
				expect(
					log.some((l) => l.includes("is not inside of the restriction")),
				).toBe(true);
				done();
			},
		);
	});

	it("should throw an error when the path does not match a regex restriction", (done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			extensions: [".js"],
			restrictions: [/\.ts$/],
		});
		const log = [];
		resolver.resolve(
			{},
			fixture,
			"pck1",
			{ log: (m) => log.push(m) },
			(err) => {
				expect(err).toBeInstanceOf(Error);
				expect(
					log.some((l) => l.includes("doesn't match the restriction")),
				).toBe(true);
				done();
			},
		);
	});

	describe("with symlinks", () => {
		const symlinkRoot = path.resolve(__dirname, "temp-restrictions-symlink");
		const allowed = path.join(symlinkRoot, "allowed");
		const outside = path.join(symlinkRoot, "outside");

		let canSymlink = true;
		try {
			fs.mkdirSync(allowed, { recursive: true });
			fs.mkdirSync(outside, { recursive: true });
			fs.writeFileSync(path.join(outside, "secret.js"), "module.exports = 1;");
			fs.writeFileSync(path.join(allowed, "real.js"), "module.exports = 2;");
			fs.symlinkSync(
				path.join(outside, "secret.js"),
				path.join(allowed, "link.js"),
				"file",
			);
			fs.symlinkSync(
				path.join("..", "outside", "secret.js"),
				path.join(allowed, "rel-link.js"),
				"file",
			);
		} catch (_err) {
			canSymlink = false;
		}

		afterAll(() => {
			for (const file of [
				path.join(allowed, "link.js"),
				path.join(allowed, "rel-link.js"),
				path.join(allowed, "real.js"),
				path.join(outside, "secret.js"),
			]) {
				try {
					fs.unlinkSync(file);
				} catch (_err) {
					// ignore
				}
			}
			for (const dir of [allowed, outside, symlinkRoot]) {
				try {
					fs.rmdirSync(dir);
				} catch (_err) {
					// ignore
				}
			}
		});

		if (canSymlink) {
			it("should reject an in-root symlink whose real target is outside the restriction", (done) => {
				const resolver = ResolverFactory.createResolver({
					fileSystem: nodeFileSystem,
					extensions: [".js"],
					restrictions: [allowed],
				});

				resolver.resolve({}, allowed, "./link.js", {}, (err, result) => {
					if (!err) return done(new Error(`expect error, got ${result}`));
					expect(err).toBeInstanceOf(Error);
					done();
				});
			});

			it("should reject an in-root relative symlink whose real target is outside the restriction", (done) => {
				const resolver = ResolverFactory.createResolver({
					fileSystem: nodeFileSystem,
					extensions: [".js"],
					restrictions: [allowed],
				});

				resolver.resolve({}, allowed, "./rel-link.js", {}, (err, result) => {
					if (!err) return done(new Error(`expect error, got ${result}`));
					expect(err).toBeInstanceOf(Error);
					done();
				});
			});

			it("should still resolve a real in-root file under the restriction", (done) => {
				const resolver = ResolverFactory.createResolver({
					fileSystem: nodeFileSystem,
					extensions: [".js"],
					restrictions: [allowed],
				});

				resolver.resolve({}, allowed, "./real.js", {}, (err, result) => {
					if (err) return done(err);
					expect(result).toEqual(path.join(allowed, "real.js"));
					done();
				});
			});
		} else {
			// eslint-disable-next-line jest/expect-expect
			it("cannot test symlinks because we have no permission to create them", () => {
				// Nothing
			});
		}
	});
});
