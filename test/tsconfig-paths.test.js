"use strict";

const assert = require("assert");
const fs = require("fs");
const { describe, it } = require("node:test");

const path = require("path");

const { ResolverFactory } = require("../");
const CachedInputFileSystem = require("../lib/CachedInputFileSystem");

const fileSystem = new CachedInputFileSystem(fs, 4000);

const baseExampleDir = path.resolve(
	__dirname,
	"fixtures",
	"tsconfig-paths",
	"base",
);
const extendsExampleDir = path.resolve(
	__dirname,
	"fixtures",
	"tsconfig-paths",
	"extends-base",
);
const extendsNpmDir = path.resolve(
	__dirname,
	"fixtures",
	"tsconfig-paths",
	"extends-npm",
);
const extendsCircularDir = path.resolve(
	__dirname,
	"fixtures",
	"tsconfig-paths",
	"extends-circular",
);
const referencesProjectDir = path.resolve(
	__dirname,
	"fixtures",
	"tsconfig-paths",
	"references-project",
);
const referencesCircularDir = path.resolve(
	__dirname,
	"fixtures",
	"tsconfig-paths",
	"references-circular",
);
const extendsUnscopedPkgDir = path.resolve(
	__dirname,
	"fixtures",
	"tsconfig-paths",
	"extends-unscoped-pkg",
);

describe("TsconfigPathsPlugin", () => {
	it("resolves exact mapped path '@components/*' via tsconfig option (example)", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem,
			extensions: [".ts", ".tsx"],
			mainFields: ["browser", "main"],
			mainFiles: ["index"],
			tsconfig: path.join(baseExampleDir, "tsconfig.json"),
			useSyncFileSystemCalls: true,
		});

		resolver.resolve(
			{},
			baseExampleDir,
			"@components/button",
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				assert.deepStrictEqual(
					result,
					path.join(baseExampleDir, "src", "components", "button.ts"),
				);
				done();
			},
		);
	});

	it("when multiple patterns match a module specifier, the pattern with the longest matching prefix before any * token is used:", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem,
			extensions: [".ts", ".tsx"],
			mainFields: ["browser", "main"],
			mainFiles: ["index"],
			tsconfig: path.join(baseExampleDir, "tsconfig.json"),
		});

		resolver.resolve({}, baseExampleDir, "longest/bar", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			assert.deepStrictEqual(
				result,
				path.join(baseExampleDir, "src", "mapped", "longest", "three.ts"),
			);
			resolver.resolve({}, baseExampleDir, "longest/bar", {}, (err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				assert.deepStrictEqual(
					result,
					path.join(baseExampleDir, "src", "mapped", "longest", "three.ts"),
				);
				done();
			});
		});
	});

	it("resolves exact mapped path 'foo' via tsconfig option (example)", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem,
			extensions: [".ts", ".tsx"],
			mainFields: ["browser", "main"],
			mainFiles: ["index"],
			tsconfig: path.join(baseExampleDir, "tsconfig.json"),
			useSyncFileSystemCalls: true,
		});

		resolver.resolve({}, baseExampleDir, "foo", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			assert.deepStrictEqual(
				result,
				path.join(baseExampleDir, "src", "mapped", "foo", "index.ts"),
			);
			done();
		});
	});

	it("resolves wildcard mapped path 'bar/*' via tsconfig option (example)", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem,
			extensions: [".ts", ".tsx"],
			mainFields: ["browser", "main"],
			mainFiles: ["index"],
			tsconfig: path.join(baseExampleDir, "tsconfig.json"),
			useSyncFileSystemCalls: true,
		});

		resolver.resolve({}, baseExampleDir, "bar/file1", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			assert.deepStrictEqual(
				result,
				path.join(baseExampleDir, "src", "mapped", "bar", "file1.ts"),
			);
			done();
		});
	});

	it("resolves wildcard mapped path '*/old-file' to specific file via tsconfig option (example)", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem,
			extensions: [".ts", ".tsx"],
			mainFields: ["browser", "main"],
			mainFiles: ["index"],
			tsconfig: path.join(baseExampleDir, "tsconfig.json"),
			useSyncFileSystemCalls: true,
		});

		resolver.resolve(
			{},
			baseExampleDir,
			"utils/old-file",
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				assert.deepStrictEqual(
					result,
					path.join(baseExampleDir, "src", "components", "new-file.ts"),
				);
				done();
			},
		);
	});

	it("falls through when no mapping exists (example)", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem,
			extensions: [".ts", ".tsx"],
			mainFields: ["browser", "main"],
			mainFiles: ["index"],
			tsconfig: path.join(baseExampleDir, "tsconfig.json"),
			useSyncFileSystemCalls: true,
		});

		resolver.resolve(
			{},
			baseExampleDir,
			"does-not-exist",
			{},
			(err, result) => {
				assert.ok(err instanceof Error);
				assert.strictEqual(result, undefined);
				done();
			},
		);
	});

	it("resolves synchronously via resolveSync when useSyncFileSystemCalls is set", () => {
		const resolver = ResolverFactory.createResolver({
			fileSystem,
			extensions: [".ts", ".tsx"],
			mainFields: ["browser", "main"],
			mainFiles: ["index"],
			tsconfig: path.join(baseExampleDir, "tsconfig.json"),
			useSyncFileSystemCalls: true,
		});

		assert.strictEqual(
			resolver.resolveSync({}, baseExampleDir, "@components/button"),
			path.join(baseExampleDir, "src", "components", "button.ts"),
		);
		assert.strictEqual(
			resolver.resolveSync({}, baseExampleDir, "bar/file1"),
			path.join(baseExampleDir, "src", "mapped", "bar", "file1.ts"),
		);
		assert.throws(() => {
			resolver.resolveSync({}, baseExampleDir, "does-not-exist");
		}, /Can't resolve 'does-not-exist'/);
	});

	it("resolveSync surfaces missing-tsconfig errors instead of fileSystem-not-sync", () => {
		const resolver = ResolverFactory.createResolver({
			fileSystem,
			tsconfig: true,
			useSyncFileSystemCalls: true,
		});

		assert.throws(() => {
			resolver.resolveSync(process.cwd(), "test");
		}, /Can't resolve 'test'/);
	});

	it("resolves '@components/*' using extends from extendsExampleDir project", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem,
			extensions: [".ts", ".tsx"],
			mainFields: ["browser", "main"],
			mainFiles: ["index"],
			tsconfig: path.join(extendsExampleDir, "tsconfig.json"),
		});
		resolver.resolve(
			{},
			extendsExampleDir,
			"@components/button",
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				assert.deepStrictEqual(
					result,
					path.join(extendsExampleDir, "src", "components", "button.ts"),
				);
				done();
			},
		);
	});

	it("resolves '@utils/*' using extends from extendsExampleDir project", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem,
			extensions: [".ts", ".tsx"],
			mainFields: ["browser", "main"],
			mainFiles: ["index"],
			tsconfig: true,
		});

		resolver.resolve(
			{},
			extendsExampleDir,
			"@utils/date",
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				assert.deepStrictEqual(
					result,
					path.join(extendsExampleDir, "src", "utils", "date.ts"),
				);
				done();
			},
		);
	});

	describe("Path wildcard patterns", () => {
		it("resolves 'foo/*' wildcard pattern", (t, done) => {
			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".ts", ".tsx"],
				mainFields: ["browser", "main"],
				mainFiles: ["index"],
				tsconfig: path.join(baseExampleDir, "tsconfig.json"),
			});

			resolver.resolve({}, baseExampleDir, "foo/file1", {}, (err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result for foo"));
				assert.deepStrictEqual(
					result,
					path.join(baseExampleDir, "src", "mapped", "bar", "file1.ts"),
				);
				done();
			});
		});

		it("resolves '*' catch-all pattern to src/mapped/star/*", (t, done) => {
			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".ts", ".tsx"],
				mainFields: ["browser", "main"],
				mainFiles: ["index"],
				tsconfig: path.join(baseExampleDir, "tsconfig.json"),
				useSyncFileSystemCalls: true,
			});

			resolver.resolve(
				{},
				baseExampleDir,
				"star-bar/index",
				{},
				(err, resultStar) => {
					if (err) return done(err);
					if (!resultStar) return done(new Error("No result for star/*"));
					assert.deepStrictEqual(
						resultStar,
						path.join(
							baseExampleDir,
							"src",
							"mapped",
							"star",
							"star-bar",
							"index.ts",
						),
					);
					done();
				},
			);
		});

		it("resolves package with mainFields", (t, done) => {
			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".ts", ".tsx"],
				mainFields: ["browser", "main"],
				mainFiles: ["index"],
				tsconfig: path.join(baseExampleDir, "tsconfig.json"),
				useSyncFileSystemCalls: true,
			});

			resolver.resolve(
				{},
				baseExampleDir,
				"main-field-package",
				{},
				(err, result) => {
					if (err) return done(err);
					if (!result) {
						return done(new Error("No result for main-field-package"));
					}
					assert.deepStrictEqual(
						result,
						path.join(
							baseExampleDir,
							"src",
							"mapped",
							"star",
							"main-field-package",
							"node.ts",
						),
					);
					done();
				},
			);
		});

		it("resolves package with browser field", (t, done) => {
			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".ts", ".tsx"],
				mainFields: ["browser", "main"],
				mainFiles: ["index"],
				tsconfig: path.join(baseExampleDir, "tsconfig.json"),
				useSyncFileSystemCalls: true,
			});

			resolver.resolve(
				{},
				baseExampleDir,
				"browser-field-package",
				{},
				(err, result) => {
					if (err) return done(err);
					if (!result) {
						return done(new Error("No result for browser-field-package"));
					}
					assert.deepStrictEqual(
						result,
						path.join(
							baseExampleDir,
							"src",
							"mapped",
							"star",
							"browser-field-package",
							"browser.ts",
						),
					);
					done();
				},
			);
		});

		it("resolves package with default index.ts", (t, done) => {
			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".ts", ".tsx"],
				mainFields: ["browser", "main"],
				mainFiles: ["index"],
				tsconfig: path.join(baseExampleDir, "tsconfig.json"),
				useSyncFileSystemCalls: true,
			});

			resolver.resolve(
				{},
				baseExampleDir,
				"no-main-field-package",
				{},
				(err, result) => {
					if (err) return done(err);
					if (!result) {
						return done(new Error("No result for no-main-field-package"));
					}
					assert.deepStrictEqual(
						result,
						path.join(
							baseExampleDir,
							"src",
							"mapped",
							"star",
							"no-main-field-package",
							"index.ts",
						),
					);
					done();
				},
			);
		});
	});

	it("should resolve paths when extending from npm package (node_modules)", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem,
			extensions: [".ts", ".tsx"],
			mainFields: ["browser", "main"],
			mainFiles: ["index"],
			tsconfig: path.join(extendsNpmDir, "tsconfig.json"),
		});

		// Should resolve @components/* from the extended npm package config
		resolver.resolve(
			{},
			extendsNpmDir,
			"@components/button",
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				// Should resolve to utils or components based on the paths in react/tsconfig.json
				assert.match(result, /src[\\/](utils|components)[\\/]button\.ts$/);
				done();
			},
		);
	});

	it("should handle malformed tsconfig.json gracefully", (t, done) => {
		const malformedExampleDir = path.resolve(
			__dirname,
			"fixtures",
			"tsconfig-paths",
			"malformed-json",
		);

		const resolver = ResolverFactory.createResolver({
			fileSystem,
			extensions: [".ts", ".tsx"],
			mainFields: ["browser", "main"],
			mainFiles: ["index"],
			tsconfig: path.join(malformedExampleDir, "tsconfig.json"),
		});

		// Should fail to resolve because the malformed tsconfig should be ignored
		resolver.resolve(
			{},
			malformedExampleDir,
			"@components/button",
			{},
			(err, result) => {
				assert.ok(err instanceof Error);
				assert.strictEqual(result, undefined);
				done();
			},
		);
	});

	// eslint-disable-next-line no-template-curly-in-string
	describe("${configDir} template variable support", () => {
		// eslint-disable-next-line no-template-curly-in-string
		it("should substitute ${configDir} in path mappings", (t, done) => {
			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".ts", ".tsx"],
				mainFields: ["browser", "main"],
				mainFiles: ["index"],
				tsconfig: path.join(baseExampleDir, "tsconfig.json"),
			});

			// The base tsconfig.json now uses ${configDir}/src/components/*
			resolver.resolve(
				{},
				baseExampleDir,
				"@components/button",
				{},
				(err, result) => {
					if (err) return done(err);
					if (!result) return done(new Error("No result"));
					assert.deepStrictEqual(
						result,
						path.join(baseExampleDir, "src", "components", "button.ts"),
					);
					done();
				},
			);
		});

		// eslint-disable-next-line no-template-curly-in-string
		it("should substitute ${configDir} in multiple path patterns", (t, done) => {
			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".ts", ".tsx"],
				mainFields: ["browser", "main"],
				mainFiles: ["index"],
				tsconfig: path.join(baseExampleDir, "tsconfig.json"),
			});

			// Test @utils/* pattern
			resolver.resolve({}, baseExampleDir, "@utils/date", {}, (err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				assert.deepStrictEqual(
					result,
					path.join(baseExampleDir, "src", "utils", "date.ts"),
				);

				// Test exact pattern 'foo'
				resolver.resolve({}, baseExampleDir, "foo", {}, (err2, result2) => {
					if (err2) return done(err2);
					if (!result2) return done(new Error("No result for foo"));
					assert.deepStrictEqual(
						result2,
						path.join(baseExampleDir, "src", "mapped", "foo", "index.ts"),
					);
					done();
				});
			});
		});

		// eslint-disable-next-line no-template-curly-in-string
		it("should substitute ${configDir} in referenced projects", (t, done) => {
			const appDir = path.join(referencesProjectDir, "packages", "app");
			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".ts", ".tsx"],
				mainFields: ["browser", "main"],
				mainFiles: ["index"],
				tsconfig: {
					configFile: path.join(appDir, "tsconfig.json"),
					references: "auto",
				},
			});

			// app's tsconfig uses ${configDir}/src/*
			resolver.resolve({}, appDir, "@app/index", {}, (err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				assert.deepStrictEqual(result, path.join(appDir, "src", "index.ts"));
				done();
			});
		});

		// eslint-disable-next-line no-template-curly-in-string
		it("should substitute ${configDir} in extends field", (t, done) => {
			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".ts", ".tsx"],
				mainFields: ["browser", "main"],
				mainFiles: ["index"],
				tsconfig: path.join(extendsExampleDir, "tsconfig.json"),
			});

			// extendsExampleDir uses ${configDir}/../base/tsconfig in extends
			resolver.resolve(
				{},
				extendsExampleDir,
				"@components/button",
				{},
				(err, result) => {
					if (err) return done(err);
					if (!result) return done(new Error("No result"));
					assert.deepStrictEqual(
						result,
						path.join(extendsExampleDir, "src", "components", "button.ts"),
					);
					done();
				},
			);
		});

		it("should handle circular extends without hanging", (t, done) => {
			const aDir = path.join(extendsCircularDir, "a");
			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".ts", ".tsx"],
				mainFields: ["browser", "main"],
				mainFiles: ["index"],
				tsconfig: path.join(aDir, "tsconfig.json"),
			});

			// a extends b, b extends a - circular. Should break cycle and resolve.
			resolver.resolve({}, aDir, "@lib/foo", {}, (err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				assert.deepStrictEqual(result, path.join(aDir, "src", "lib", "foo.ts"));
				done();
			});
		});

		// eslint-disable-next-line no-template-curly-in-string
		it("should substitute ${configDir} in references field", (t, done) => {
			const sharedDir = path.join(referencesProjectDir, "packages", "shared");
			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".ts", ".tsx"],
				mainFields: ["browser", "main"],
				mainFiles: ["index"],
				tsconfig: {
					configFile: path.join(referencesProjectDir, "tsconfig.json"),
					references: "auto",
				},
			});

			// root tsconfig uses ${configDir}/packages/shared in references
			resolver.resolve({}, sharedDir, "@shared/helper", {}, (err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				assert.deepStrictEqual(
					result,
					path.join(sharedDir, "src", "utils", "helper.ts"),
				);
				done();
			});
		});
	});

	it("should override baseUrl from tsconfig with option", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem,
			extensions: [".ts", ".tsx"],
			mainFields: ["browser", "main"],
			mainFiles: ["index"],
			tsconfig: {
				configFile: path.join(baseExampleDir, "tsconfig.json"),
				baseUrl: "./src", // Override baseUrl from tsconfig (which is ".")
			},
		});

		resolver.resolve(
			{},
			baseExampleDir,
			"utils/date", // This should resolve relative to baseExampleDir/src (the overridden baseUrl)
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				assert.deepStrictEqual(
					result,
					path.join(baseExampleDir, "src", "utils", "date.ts"),
				);
				done();
			},
		);
	});

	it("should use baseUrl from tsconfig when not overridden", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem,
			extensions: [".ts", ".tsx"],
			mainFields: ["browser", "main"],
			mainFiles: ["index"],
			tsconfig: {
				configFile: path.join(baseExampleDir, "tsconfig.json"),
				// baseUrl not specified, should use from tsconfig (which is ".")
			},
		});

		// With baseUrl from tsconfig (.), modules should resolve relative to baseExampleDir
		resolver.resolve(
			{},
			baseExampleDir,
			"src/utils/date", // This should resolve relative to baseExampleDir (the tsconfig baseUrl)
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				assert.deepStrictEqual(
					result,
					path.join(baseExampleDir, "src", "utils", "date.ts"),
				);
				done();
			},
		);
	});

	describe("TypeScript Project References", () => {
		it("should support tsconfig object format with configFile", (t, done) => {
			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".ts", ".tsx"],
				mainFields: ["browser", "main"],
				mainFiles: ["index"],
				tsconfig: {
					configFile: path.join(baseExampleDir, "tsconfig.json"),
					references: "auto",
				},
			});

			resolver.resolve(
				{},
				baseExampleDir,
				"@components/button",
				{},
				(err, result) => {
					if (err) return done(err);
					if (!result) return done(new Error("No result"));
					assert.deepStrictEqual(
						result,
						path.join(baseExampleDir, "src", "components", "button.ts"),
					);
					done();
				},
			);
		});

		it("should resolve own paths (without cross-project references)", (t, done) => {
			const appDir = path.join(referencesProjectDir, "packages", "app");
			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".ts", ".tsx"],
				mainFields: ["browser", "main"],
				mainFiles: ["index"],
				tsconfig: {
					configFile: path.join(appDir, "tsconfig.json"),
					references: "auto",
				},
			});

			// app's own @app/* paths should work
			resolver.resolve({}, appDir, "@app/index", {}, (err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				assert.deepStrictEqual(result, path.join(appDir, "src", "index.ts"));

				// @shared/* from app context should fail (not in app's paths)
				resolver.resolve({}, appDir, "@shared/utils/helper", {}, (err2) => {
					assert.ok(err2 instanceof Error);
					done();
				});
			});
		});

		it("should resolve self-references within a referenced project", (t, done) => {
			const appDir = path.join(referencesProjectDir, "packages", "app");
			const sharedDir = path.join(referencesProjectDir, "packages", "shared");

			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".ts", ".tsx"],
				mainFields: ["browser", "main"],
				mainFiles: ["index"],
				tsconfig: {
					configFile: path.join(appDir, "tsconfig.json"),
					references: "auto",
				},
			});

			// When resolving from sharedDir, @shared/* should work (self-reference)
			resolver.resolve({}, sharedDir, "@shared/helper", {}, (err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				assert.deepStrictEqual(
					result,
					path.join(sharedDir, "src", "utils", "helper.ts"),
				);
				done();
			});
		});

		it("should support explicit references array", (t, done) => {
			const appDir = path.join(referencesProjectDir, "packages", "app");
			const sharedSrcDir = path.join(
				referencesProjectDir,
				"packages",
				"shared",
				"src",
			);

			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".ts", ".tsx"],
				mainFields: ["browser", "main"],
				mainFiles: ["index"],
				tsconfig: {
					configFile: path.join(appDir, "tsconfig.json"),
					references: ["../shared"],
				},
			});

			// Self-reference should still work with explicit references
			resolver.resolve(
				{},
				sharedSrcDir,
				"@shared/helper",
				{},
				(err, result) => {
					if (err) return done(err);
					if (!result) return done(new Error("No result"));
					assert.deepStrictEqual(
						result,
						path.join(sharedSrcDir, "utils", "helper.ts"),
					);
					done();
				},
			);
		});

		it("should not load references when references option is omitted", (t, done) => {
			const appDir = path.join(referencesProjectDir, "packages", "app");
			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".ts", ".tsx"],
				mainFields: ["browser", "main"],
				mainFiles: ["index"],
				tsconfig: {
					configFile: path.join(appDir, "tsconfig.json"),
					// references is not specified - should not load any references
				},
			});

			// @shared/* should fail because references are not loaded
			resolver.resolve({}, appDir, "@shared/utils/helper", {}, (err) => {
				assert.ok(err instanceof Error);
				done();
			});
		});

		it("should handle nested references (when a referenced project has its own references)", (t, done) => {
			const appDir = path.join(referencesProjectDir, "packages", "app");
			const utilsSrcDir = path.join(
				referencesProjectDir,
				"packages",
				"utils",
				"src",
			);

			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".ts", ".tsx"],
				mainFields: ["browser", "main"],
				mainFiles: ["index"],
				tsconfig: {
					configFile: path.join(appDir, "tsconfig.json"),
					references: "auto",
				},
			});

			// utils has @utils/* paths, and shared references utils
			// When resolving from utils context, @utils/* should work
			resolver.resolve({}, utilsSrcDir, "@utils/date", {}, (err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				assert.deepStrictEqual(
					result,
					path.join(utilsSrcDir, "core", "date.ts"),
				);
				done();
			});
		});

		describe("modules resolution with references", () => {
			it("should resolve modules from main project's baseUrl", (t, done) => {
				const appDir = path.join(referencesProjectDir, "packages", "app");
				const resolver = ResolverFactory.createResolver({
					fileSystem,
					extensions: [".ts", ".tsx"],
					mainFields: ["browser", "main"],
					mainFiles: ["index"],
					tsconfig: {
						configFile: path.join(appDir, "tsconfig.json"),
						references: "auto",
					},
				});

				// Should resolve relative to app's baseUrl (app root)
				resolver.resolve(
					{},
					appDir,
					"src/components/Button",
					{},
					(err, result) => {
						if (err) return done(err);
						if (!result) return done(new Error("No result"));
						assert.deepStrictEqual(
							result,
							path.join(appDir, "src", "components", "Button.ts"),
						);
						done();
					},
				);
			});

			it("should resolve modules from referenced project's baseUrl (self-reference)", (t, done) => {
				const appDir = path.join(referencesProjectDir, "packages", "app");
				const sharedSrcDir = path.join(
					referencesProjectDir,
					"packages",
					"shared",
					"src",
				);

				const resolver = ResolverFactory.createResolver({
					fileSystem,
					extensions: [".ts", ".tsx"],
					mainFields: ["browser", "main"],
					mainFiles: ["index"],
					tsconfig: {
						configFile: path.join(appDir, "tsconfig.json"),
						references: "auto",
					},
				});

				// When resolving from shared/src, should use shared's baseUrl (shared/src) // cspell:disable-line
				resolver.resolve(
					{},
					sharedSrcDir,
					"utils/helper",
					{},
					(err, result) => {
						if (err) return done(err);
						if (!result) return done(new Error("No result"));
						assert.deepStrictEqual(
							result,
							path.join(sharedSrcDir, "utils", "helper.ts"),
						);
						done();
					},
				);
			});

			it("should resolve components from referenced project's baseUrl", (t, done) => {
				const appDir = path.join(referencesProjectDir, "packages", "app");
				const sharedSrcDir = path.join(
					referencesProjectDir,
					"packages",
					"shared",
					"src",
				);

				const resolver = ResolverFactory.createResolver({
					fileSystem,
					extensions: [".ts", ".tsx"],
					mainFields: ["browser", "main"],
					mainFiles: ["index"],
					tsconfig: {
						configFile: path.join(appDir, "tsconfig.json"),
						references: "auto",
					},
				});

				// Resolve components from shared project's baseUrl
				resolver.resolve(
					{},
					sharedSrcDir,
					"components/Input",
					{},
					(err, result) => {
						if (err) return done(err);
						if (!result) return done(new Error("No result"));
						assert.deepStrictEqual(
							result,
							path.join(sharedSrcDir, "components", "Input.ts"),
						);
						done();
					},
				);
			});

			it("should use correct baseUrl based on request context", (t, done) => {
				const appDir = path.join(referencesProjectDir, "packages", "app");
				const sharedDir = path.join(referencesProjectDir, "packages", "shared");

				const resolver = ResolverFactory.createResolver({
					fileSystem,
					extensions: [".ts", ".tsx"],
					mainFields: ["browser", "main"],
					mainFiles: ["index"],
					tsconfig: {
						configFile: path.join(appDir, "tsconfig.json"),
						references: "auto",
					},
				});

				// From app context, 'src/index' should resolve to app/src/index
				resolver.resolve({}, appDir, "src/index", {}, (err, result) => {
					if (err) return done(err);
					if (!result) return done(new Error("No result from app"));
					assert.deepStrictEqual(result, path.join(appDir, "src", "index.ts"));

					// From shared context, 'utils/helper' should resolve to shared/src/utils/helper
					resolver.resolve(
						{},
						path.join(sharedDir, "src"),
						"utils/helper",
						{},
						(err2, result2) => {
							if (err2) return done(err2);
							if (!result2) return done(new Error("No result from shared"));
							assert.deepStrictEqual(
								result2,
								path.join(sharedDir, "src", "utils", "helper.ts"),
							);
							done();
						},
					);
				});
			});

			it("should support explicit references with modules resolution", (t, done) => {
				const appDir = path.join(referencesProjectDir, "packages", "app");
				const sharedSrcDir = path.join(
					referencesProjectDir,
					"packages",
					"shared",
					"src",
				);

				const resolver = ResolverFactory.createResolver({
					fileSystem,
					extensions: [".ts", ".tsx"],
					mainFields: ["browser", "main"],
					mainFiles: ["index"],
					tsconfig: {
						configFile: path.join(appDir, "tsconfig.json"),
						references: ["../shared"],
					},
				});

				// Explicit references should also support modules resolution
				resolver.resolve(
					{},
					sharedSrcDir,
					"utils/helper",
					{},
					(err, result) => {
						if (err) return done(err);
						if (!result) return done(new Error("No result"));
						assert.deepStrictEqual(
							result,
							path.join(sharedSrcDir, "utils", "helper.ts"),
						);
						done();
					},
				);
			});
		});

		describe("paths are scoped to the containing tsconfig (tsc-aligned)", () => {
			// Fixture layout:
			//   references-priority/tsconfig.json       -> "@lib/*": ["./main-lib/*"], references ./ref
			//   references-priority/main-lib/foo.ts     (source = "main")
			//   references-priority/ref/tsconfig.json   -> "@lib/*": ["./ref-lib/*"]
			//   references-priority/ref/ref-lib/foo.ts  (source = "ref")
			//
			// `tsc` resolves `paths` using the tsconfig that owns the importing
			// file, not by merging across a `references` edge, so each context
			// must see its own target even though the alias name collides.
			const referencesPriorityDir = path.resolve(
				__dirname,
				"fixtures",
				"tsconfig-paths",
				"references-priority",
			);
			const refDir = path.join(referencesPriorityDir, "ref");

			it("resolves @lib/foo from the main context to main's target", (t, done) => {
				const resolver = ResolverFactory.createResolver({
					fileSystem,
					extensions: [".ts", ".tsx"],
					mainFields: ["browser", "main"],
					mainFiles: ["index"],
					tsconfig: {
						configFile: path.join(referencesPriorityDir, "tsconfig.json"),
						references: "auto",
					},
				});

				resolver.resolve(
					{},
					referencesPriorityDir,
					"@lib/foo",
					{},
					(err, result) => {
						if (err) return done(err);
						if (!result) return done(new Error("No result"));
						assert.deepStrictEqual(
							result,
							path.join(referencesPriorityDir, "main-lib", "foo.ts"),
						);
						done();
					},
				);
			});

			it("resolves @lib/foo from the reference context to the reference's target", (t, done) => {
				const resolver = ResolverFactory.createResolver({
					fileSystem,
					extensions: [".ts", ".tsx"],
					mainFields: ["browser", "main"],
					mainFiles: ["index"],
					tsconfig: {
						configFile: path.join(referencesPriorityDir, "tsconfig.json"),
						references: "auto",
					},
				});

				resolver.resolve({}, refDir, "@lib/foo", {}, (err, result) => {
					if (err) return done(err);
					if (!result) return done(new Error("No result"));
					assert.deepStrictEqual(
						result,
						path.join(refDir, "ref-lib", "foo.ts"),
					);
					done();
				});
			});

			it("reference paths do not leak into a sibling/unrelated main lookup", (t, done) => {
				// When references are loaded but the request is made from the
				// main context, the reference's alias target must not win over
				// the main's target — even if the reference's target also exists.
				const resolver = ResolverFactory.createResolver({
					fileSystem,
					extensions: [".ts", ".tsx"],
					mainFields: ["browser", "main"],
					mainFiles: ["index"],
					tsconfig: {
						configFile: path.join(referencesPriorityDir, "tsconfig.json"),
						references: "auto",
					},
				});

				resolver.resolve(
					{},
					referencesPriorityDir,
					"@lib/foo",
					{},
					(err, result) => {
						if (err) return done(err);
						assert.notDeepStrictEqual(
							result,
							path.join(refDir, "ref-lib", "foo.ts"),
						);
						done();
					},
				);
			});
		});
	});

	describe("bug: baseUrl from deep extends chain (non-sibling directories)", () => {
		const deepBaseUrlDir = path.resolve(
			__dirname,
			"fixtures",
			"tsconfig-paths",
			"extends-deep-baseurl",
		);

		it("should resolve paths whose baseUrl comes from a grandparent extends in a non-sibling directory", (t, done) => {
			const appDir = path.join(deepBaseUrlDir, "packages", "app");
			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".ts", ".tsx"],
				mainFields: ["browser", "main"],
				mainFiles: ["index"],
				tsconfig: path.join(appDir, "tsconfig.json"),
			});

			resolver.resolve({}, appDir, "@base/utils/format", {}, (err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				assert.deepStrictEqual(
					result,
					path.join(
						deepBaseUrlDir,
						"tsconfig-base",
						"src",
						"utils",
						"format.ts",
					),
				);
				done();
			});
		});
	});

	describe("bug: scoped npm package in extends field (@scope/name)", () => {
		const pkgEntryDir = path.resolve(
			__dirname,
			"fixtures",
			"tsconfig-paths",
			"extends-pkg-entry",
		);

		it("should resolve paths inherited from a scoped npm package tsconfig (extends '@my-tsconfig/base')", (t, done) => {
			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".ts", ".tsx"],
				mainFields: ["browser", "main"],
				mainFiles: ["index"],
				tsconfig: path.join(pkgEntryDir, "tsconfig.json"),
			});

			resolver.resolve({}, pkgEntryDir, "@pkg/util", {}, (err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				assert.deepStrictEqual(
					result,
					path.join(
						pkgEntryDir,
						"node_modules",
						"@my-tsconfig",
						"base",
						"src",
						"util.ts",
					),
				);
				done();
			});
		});
	});

	it("should not error when tsconfig is true but tsconfig.json does not exist", (t, done) => {
		const noTsconfigDir = path.resolve(
			__dirname,
			"fixtures",
			"tsconfig-paths",
			"no-tsconfig",
		);

		const resolver = ResolverFactory.createResolver({
			fileSystem,
			extensions: [".ts", ".tsx"],
			mainFields: ["browser", "main"],
			mainFiles: ["index"],
			tsconfig: true,
		});

		// Should resolve normally via standard resolution (no tsconfig paths applied)
		resolver.resolve({}, noTsconfigDir, "./src/index", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			assert.deepStrictEqual(
				result,
				path.join(noTsconfigDir, "src", "index.ts"),
			);
			done();
		});
	});

	it("should error when tsconfig is an explicit path but the file does not exist", (t, done) => {
		const noTsconfigDir = path.resolve(
			__dirname,
			"fixtures",
			"tsconfig-paths",
			"no-tsconfig",
		);

		const resolver = ResolverFactory.createResolver({
			fileSystem,
			extensions: [".ts", ".tsx"],
			mainFields: ["browser", "main"],
			mainFiles: ["index"],
			tsconfig: path.join(noTsconfigDir, "tsconfig.json"),
		});

		resolver.resolve({}, noTsconfigDir, "./src/index", {}, (err, result) => {
			try {
				assert.ok(err);
				assert.strictEqual(
					/** @type {NodeJS.ErrnoException} */ (err).code,
					"ENOENT",
				);
				assert.strictEqual(result, undefined);
				done();
			} catch (err_) {
				done(err_);
			}
		});
	});

	describe("tsconfig: true should walk up parent directories", () => {
		const upwardDir = path.resolve(
			__dirname,
			"fixtures",
			"tsconfig-paths",
			"upward-traversal",
		);

		it("should find tsconfig.json in parent directory when resolving from subdirectory", (t, done) => {
			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".ts", ".tsx"],
				mainFields: ["browser", "main"],
				mainFiles: ["index"],
				tsconfig: true,
			});

			// resolve from src/app/ — tsconfig.json is in upward-traversal/ (parent's parent)
			resolver.resolve(
				{},
				path.join(upwardDir, "src", "app"),
				"@utils/helper",
				{},
				(err, result) => {
					if (err) return done(err);
					if (!result) return done(new Error("No result"));
					assert.deepStrictEqual(
						result,
						path.join(upwardDir, "src", "utils", "helper.ts"),
					);
					done();
				},
			);
		});

		it("should still fall through when no tsconfig.json exists anywhere up", (t, done) => {
			const noTsconfigDir = path.resolve(
				__dirname,
				"fixtures",
				"tsconfig-paths",
				"no-tsconfig",
			);

			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".ts", ".tsx"],
				mainFields: ["browser", "main"],
				mainFiles: ["index"],
				tsconfig: true,
			});

			resolver.resolve({}, noTsconfigDir, "./src/index", {}, (err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				assert.deepStrictEqual(
					result,
					path.join(noTsconfigDir, "src", "index.ts"),
				);
				done();
			});
		});
	});

	describe("tsconfig without baseUrl should not add configDir to module search paths", () => {
		const noBaseUrlDir = path.resolve(
			__dirname,
			"fixtures",
			"tsconfig-paths",
			"no-baseurl-upward",
		);

		it("should resolve node_modules package instead of matching a file at tsconfig root", (t, done) => {
			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".ts", ".js", ".json"],
				mainFields: ["main"],
				mainFiles: ["index"],
				tsconfig: true,
			});

			// Resolve "package" from subdir/ which has node_modules/package/.
			// The parent tsconfig.json (without baseUrl) should NOT cause the
			// tsconfig root to become a module search path — otherwise "package"
			// would incorrectly match <root>/package.json instead of the real
			// node_modules/package/index.js.
			resolver.resolve(
				{},
				path.join(noBaseUrlDir, "subdir"),
				"package",
				{},
				(err, result) => {
					if (err) return done(err);
					if (!result) return done(new Error("No result"));
					assert.deepStrictEqual(
						result,
						path.join(
							noBaseUrlDir,
							"subdir",
							"node_modules",
							"package",
							"index.js",
						),
					);
					done();
				},
			);
		});
	});

	describe("JSONC support (comments in tsconfig.json)", () => {
		const jsoncExampleDir = path.resolve(
			__dirname,
			"fixtures",
			"tsconfig-paths",
			"jsonc-comments",
		);

		it("should parse tsconfig.json with line comments (//)", (t, done) => {
			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".ts", ".tsx"],
				mainFields: ["browser", "main"],
				mainFiles: ["index"],
				tsconfig: path.join(jsoncExampleDir, "tsconfig.json"),
				useSyncFileSystemCalls: true,
			});

			resolver.resolve(
				{},
				jsoncExampleDir,
				"@components/button",
				{},
				(err, result) => {
					if (err) return done(err);
					if (!result) return done(new Error("No result"));
					assert.deepStrictEqual(
						result,
						path.join(jsoncExampleDir, "src", "components", "button.ts"),
					);
					done();
				},
			);
		});

		it("should parse tsconfig.json with block comments (/* */)", (t, done) => {
			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".ts", ".tsx"],
				mainFields: ["browser", "main"],
				mainFiles: ["index"],
				tsconfig: path.join(jsoncExampleDir, "tsconfig.json"),
				useSyncFileSystemCalls: true,
			});

			resolver.resolve({}, jsoncExampleDir, "bar/index", {}, (err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				assert.deepStrictEqual(
					result,
					path.join(jsoncExampleDir, "src", "mapped", "bar", "index.ts"),
				);
				done();
			});
		});

		it("should parse tsconfig.json with mixed comments", (t, done) => {
			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".ts", ".tsx"],
				mainFields: ["browser", "main"],
				mainFiles: ["index"],
				tsconfig: path.join(jsoncExampleDir, "tsconfig.json"),
				useSyncFileSystemCalls: true,
			});

			resolver.resolve({}, jsoncExampleDir, "foo", {}, (err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				assert.deepStrictEqual(
					result,
					path.join(jsoncExampleDir, "src", "mapped", "foo", "index.ts"),
				);
				done();
			});
		});
	});

	describe("bug: circular project references should not cause infinite recursion", () => {
		it("should handle circular references without hanging or crashing", (t, done) => {
			const aDir = path.join(referencesCircularDir, "a");
			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".ts", ".tsx"],
				mainFields: ["browser", "main"],
				mainFiles: ["index"],
				tsconfig: {
					configFile: path.join(aDir, "tsconfig.json"),
					references: "auto",
				},
			});

			// a references b, b references a — should not stack overflow
			resolver.resolve({}, aDir, "@a/index", {}, (err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				assert.deepStrictEqual(result, path.join(aDir, "src", "index.ts"));
				done();
			});
		});

		it("should resolve paths from a circular-referenced project", (t, done) => {
			const aDir = path.join(referencesCircularDir, "a");
			const bDir = path.join(referencesCircularDir, "b");
			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".ts", ".tsx"],
				mainFields: ["browser", "main"],
				mainFiles: ["index"],
				tsconfig: {
					configFile: path.join(aDir, "tsconfig.json"),
					references: "auto",
				},
			});

			// From b's context, @b/* should resolve via b's own paths
			resolver.resolve({}, bDir, "@b/index", {}, (err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				assert.deepStrictEqual(result, path.join(bDir, "src", "index.ts"));
				done();
			});
		});
	});

	describe("bug: '@*' pattern should fall through for scoped npm packages (#20944)", () => {
		const scopedPkgDir = path.resolve(
			__dirname,
			"fixtures",
			"tsconfig-paths",
			"scoped-pkg-fallthrough",
		);

		it("should resolve '@helper' via the '@*' mapping when the mapped path exists", (t, done) => {
			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".ts", ".tsx", ".js"],
				mainFields: ["main"],
				mainFiles: ["index"],
				tsconfig: path.join(scopedPkgDir, "tsconfig.json"),
			});

			resolver.resolve({}, scopedPkgDir, "@helper", {}, (err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				assert.deepStrictEqual(
					result,
					path.join(scopedPkgDir, "src", "helper", "index.ts"),
				);
				done();
			});
		});

		it("should fall through to node_modules for '@sentry/react' when '@*' mapping does not resolve", (t, done) => {
			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".ts", ".tsx", ".js"],
				mainFields: ["main"],
				mainFiles: ["index"],
				tsconfig: path.join(scopedPkgDir, "tsconfig.json"),
			});

			resolver.resolve({}, scopedPkgDir, "@sentry/react", {}, (err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				assert.deepStrictEqual(
					result,
					path.join(
						scopedPkgDir,
						"node_modules",
						"@sentry",
						"react",
						"index.js",
					),
				);
				done();
			});
		});
	});

	describe("bug: unscoped npm package in extends field", () => {
		it("should resolve paths inherited from an unscoped npm package tsconfig (extends 'my-base-config')", (t, done) => {
			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".ts", ".tsx"],
				mainFields: ["browser", "main"],
				mainFiles: ["index"],
				tsconfig: path.join(extendsUnscopedPkgDir, "tsconfig.json"),
			});

			resolver.resolve(
				{},
				extendsUnscopedPkgDir,
				"@pkg/util",
				{},
				(err, result) => {
					if (err) return done(err);
					if (!result) return done(new Error("No result"));
					assert.deepStrictEqual(
						result,
						path.join(
							extendsUnscopedPkgDir,
							"node_modules",
							"my-base-config",
							"src",
							"util.ts",
						),
					);
					done();
				},
			);
		});
	});
});
