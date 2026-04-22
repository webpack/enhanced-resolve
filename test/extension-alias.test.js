"use strict";

const fs = require("fs");
const path = require("path");

const CachedInputFileSystem = require("../lib/CachedInputFileSystem");
const ResolverFactory = require("../lib/ResolverFactory");

/** @typedef {import("../lib/util/entrypoints").ImportsField} ImportsField */

describe("extension-alias", () => {
	const fixture = path.resolve(__dirname, "fixtures", "extension-alias");
	const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

	const resolver = ResolverFactory.createResolver({
		extensions: [".js"],
		fileSystem: nodeFileSystem,
		mainFiles: ["index.js"],
		extensionAlias: {
			".js": [".ts", ".js"],
			".mjs": ".mts",
		},
	});

	it("should alias fully specified file", (done) => {
		resolver.resolve({}, fixture, "./index.js", {}, (err, result) => {
			if (err) return done(err);
			expect(result).toEqual(path.resolve(fixture, "index.ts"));
			done();
		});
	});

	it("should alias fully specified file when there are two alternatives", (done) => {
		resolver.resolve({}, fixture, "./dir/index.js", {}, (err, result) => {
			if (err) return done(err);
			expect(result).toEqual(path.resolve(fixture, "dir", "index.ts"));
			done();
		});
	});

	it("should also allow the second alternative", (done) => {
		resolver.resolve({}, fixture, "./dir2/index.js", {}, (err, result) => {
			if (err) return done(err);
			expect(result).toEqual(path.resolve(fixture, "dir2", "index.js"));
			done();
		});
	});

	it("should support alias option without an array", (done) => {
		resolver.resolve({}, fixture, "./dir2/index.mjs", {}, (err, result) => {
			if (err) return done(err);
			expect(result).toEqual(path.resolve(fixture, "dir2", "index.mts"));
			done();
		});
	});

	it("should not allow to fallback to the original extension or add extensions", (done) => {
		resolver.resolve({}, fixture, "./index.mjs", {}, (err, _result) => {
			expect(err).toBeInstanceOf(Error);
			done();
		});
	});

	it("should try multiple extension aliases in order and logs each failure", (done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			extensionAlias: { ".js": [".missing1", ".missing2", ".js"] },
		});
		const log = [];
		resolver.resolve(
			{},
			path.join(__dirname, "fixtures"),
			"./a.js",
			{ log: (m) => log.push(m) },
			(err, result) => {
				if (err) return done(err);
				expect(result).toEqual(
					path.join(path.join(__dirname, "fixtures"), "a.js"),
				);
				expect(
					log.some((l) => l.includes("Failed to alias from extension alias")),
				).toBe(true);
				done();
			},
		);
	});

	describe("imports field", () => {
		const importsFixture = path.resolve(
			__dirname,
			"fixtures",
			"imports-field-extension-alias",
		);

		it("should apply extension alias to paths resolved via imports field", (done) => {
			resolver.resolve({}, importsFixture, "#foo", {}, (err, result) => {
				if (err) return done(err);
				expect(result).toEqual(path.resolve(importsFixture, "foo.ts"));
				done();
			});
		});

		it("should fall back to later alternatives when first alias does not exist", (done) => {
			resolver.resolve({}, importsFixture, "#bar", {}, (err, result) => {
				if (err) return done(err);
				expect(result).toEqual(path.resolve(importsFixture, "bar.js"));
				done();
			});
		});

		it("should support single-string alias (no array) via imports field", (done) => {
			resolver.resolve({}, importsFixture, "#only", {}, (err, _result) => {
				// ".mjs": ".mts" is a strict mapping with no fallback, so this
				// should error because only.mts does not exist
				expect(err).toBeInstanceOf(Error);
				done();
			});
		});

		it("should not fall back to the original extension via imports field (strict alias)", (done) => {
			const strictResolver = ResolverFactory.createResolver({
				extensions: [".js"],
				fileSystem: nodeFileSystem,
				extensionAlias: { ".js": [".ts"] },
			});
			strictResolver.resolve({}, importsFixture, "#bar", {}, (err, _result) => {
				// bar.ts does not exist and we explicitly disallow fallback
				expect(err).toBeInstanceOf(Error);
				done();
			});
		});
	});

	describe("exports field (extensionAliasForExports)", () => {
		const exportsFixture = path.resolve(
			__dirname,
			"fixtures",
			"exports-field-extension-alias-opt-in",
		);

		it("should not apply extension alias to exports-field targets by default (Node.js-aligned)", (done) => {
			const defaultResolver = ResolverFactory.createResolver({
				extensions: [".js"],
				extensionAlias: { ".js": [".ts", ".js"] },
				fileSystem: nodeFileSystem,
				fullySpecified: true,
				conditionNames: ["default"],
			});
			defaultResolver.resolve(
				{},
				exportsFixture,
				"pkg/string.js",
				{},
				(err, result) => {
					if (err) return done(err);
					expect(result).toEqual(
						path.resolve(exportsFixture, "./node_modules/pkg/dist/string.js"),
					);
					done();
				},
			);
		});

		it("should prefer the TS source over the exports-declared JS target when the option is enabled", (done) => {
			const tsResolver = ResolverFactory.createResolver({
				extensions: [".js"],
				extensionAlias: { ".js": [".ts", ".js"] },
				extensionAliasForExports: true,
				fileSystem: nodeFileSystem,
				fullySpecified: true,
				conditionNames: ["default"],
			});
			tsResolver.resolve(
				{},
				exportsFixture,
				"pkg/string.js",
				{},
				(err, result) => {
					if (err) return done(err);
					expect(result).toEqual(
						path.resolve(exportsFixture, "./node_modules/pkg/dist/string.ts"),
					);
					done();
				},
			);
		});
	});

	describe("should not apply extension alias to extensions or mainFiles field", () => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			fileSystem: nodeFileSystem,
			mainFiles: ["index.js"],
			extensionAlias: {
				".js": [],
			},
		});

		it("directory", (done) => {
			resolver.resolve({}, fixture, "./dir2", {}, (err, result) => {
				if (err) return done(err);
				expect(result).toEqual(path.resolve(fixture, "dir2", "index.js"));
				done();
			});
		});

		it("file", (done) => {
			resolver.resolve({}, fixture, "./dir2/index", {}, (err, result) => {
				if (err) return done(err);
				expect(result).toEqual(path.resolve(fixture, "dir2", "index.js"));
				done();
			});
		});
	});
});
