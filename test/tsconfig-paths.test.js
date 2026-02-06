"use strict";

const fs = require("fs");
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
const referencesProjectDir = path.resolve(
	__dirname,
	"fixtures",
	"tsconfig-paths",
	"references-project",
);

describe("TsconfigPathsPlugin", () => {
	it("resolves exact mapped path '@components/*' via tsconfig option (example)", (done) => {
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
				expect(result).toEqual(
					path.join(baseExampleDir, "src", "components", "button.ts"),
				);
				done();
			},
		);
	});

	it("when multiple patterns match a module specifier, the pattern with the longest matching prefix before any * token is used:", (done) => {
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
			expect(result).toEqual(
				path.join(baseExampleDir, "src", "mapped", "longest", "three.ts"),
			);
			resolver.resolve({}, baseExampleDir, "longest/bar", {}, (err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				expect(result).toEqual(
					path.join(baseExampleDir, "src", "mapped", "longest", "three.ts"),
				);
				done();
			});
		});
	});

	it("resolves exact mapped path 'foo' via tsconfig option (example)", (done) => {
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
			expect(result).toEqual(
				path.join(baseExampleDir, "src", "mapped", "foo", "index.ts"),
			);
			done();
		});
	});

	it("resolves wildcard mapped path 'bar/*' via tsconfig option (example)", (done) => {
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
			expect(result).toEqual(
				path.join(baseExampleDir, "src", "mapped", "bar", "file1.ts"),
			);
			done();
		});
	});

	it("resolves wildcard mapped path '*/old-file' to specific file via tsconfig option (example)", (done) => {
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
				expect(result).toEqual(
					path.join(baseExampleDir, "src", "components", "new-file.ts"),
				);
				done();
			},
		);
	});

	it("falls through when no mapping exists (example)", (done) => {
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
				expect(err).toBeInstanceOf(Error);
				expect(result).toBeUndefined();
				done();
			},
		);
	});

	it("resolves '@components/*' using extends from extendsExampleDir project", (done) => {
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
				expect(result).toEqual(
					path.join(extendsExampleDir, "src", "components", "button.ts"),
				);
				done();
			},
		);
	});

	it("resolves '@utils/*' using extends from extendsExampleDir project", (done) => {
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
				expect(result).toEqual(
					path.join(extendsExampleDir, "src", "utils", "date.ts"),
				);
				done();
			},
		);
	});

	describe("Path wildcard patterns", () => {
		it("resolves 'foo/*' wildcard pattern", (done) => {
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
				expect(result).toEqual(
					path.join(baseExampleDir, "src", "mapped", "bar", "file1.ts"),
				);
				done();
			});
		});

		it("resolves '*' catch-all pattern to src/mapped/star/*", (done) => {
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
					expect(resultStar).toEqual(
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

		it("resolves package with mainFields", (done) => {
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
					expect(result).toEqual(
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

		it("resolves package with browser field", (done) => {
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
					expect(result).toEqual(
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

		it("resolves package with default index.ts", (done) => {
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
					expect(result).toEqual(
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

	it("should resolve paths when extending from npm package (node_modules)", (done) => {
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
				expect(result).toMatch(/src[\\/](utils|components)[\\/]button\.ts$/);
				done();
			},
		);
	});

	it("should handle malformed tsconfig.json gracefully", (done) => {
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
				expect(err).toBeInstanceOf(Error);
				expect(result).toBeUndefined();
				done();
			},
		);
	});

	// eslint-disable-next-line no-template-curly-in-string
	describe("${configDir} template variable support", () => {
		// eslint-disable-next-line no-template-curly-in-string
		it("should substitute ${configDir} in path mappings", (done) => {
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
					expect(result).toEqual(
						path.join(baseExampleDir, "src", "components", "button.ts"),
					);
					done();
				},
			);
		});

		// eslint-disable-next-line no-template-curly-in-string
		it("should substitute ${configDir} in multiple path patterns", (done) => {
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
				expect(result).toEqual(
					path.join(baseExampleDir, "src", "utils", "date.ts"),
				);

				// Test exact pattern 'foo'
				resolver.resolve({}, baseExampleDir, "foo", {}, (err2, result2) => {
					if (err2) return done(err2);
					if (!result2) return done(new Error("No result for foo"));
					expect(result2).toEqual(
						path.join(baseExampleDir, "src", "mapped", "foo", "index.ts"),
					);
					done();
				});
			});
		});

		// eslint-disable-next-line no-template-curly-in-string
		it("should substitute ${configDir} in referenced projects", (done) => {
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
				expect(result).toEqual(path.join(appDir, "src", "index.ts"));
				done();
			});
		});

		// eslint-disable-next-line no-template-curly-in-string
		it("should substitute ${configDir} in extends field", (done) => {
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
					expect(result).toEqual(
						path.join(extendsExampleDir, "src", "components", "button.ts"),
					);
					done();
				},
			);
		});

		// eslint-disable-next-line no-template-curly-in-string
		it("should substitute ${configDir} in references field", (done) => {
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
				expect(result).toEqual(
					path.join(sharedDir, "src", "utils", "helper.ts"),
				);
				done();
			});
		});
	});

	it("should override baseUrl from tsconfig with option", (done) => {
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
				expect(result).toEqual(
					path.join(baseExampleDir, "src", "utils", "date.ts"),
				);
				done();
			},
		);
	});

	it("should use baseUrl from tsconfig when not overridden", (done) => {
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
				expect(result).toEqual(
					path.join(baseExampleDir, "src", "utils", "date.ts"),
				);
				done();
			},
		);
	});

	describe("TypeScript Project References", () => {
		it("should support tsconfig object format with configFile", (done) => {
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
					expect(result).toEqual(
						path.join(baseExampleDir, "src", "components", "button.ts"),
					);
					done();
				},
			);
		});

		it("should resolve own paths (without cross-project references)", (done) => {
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
				expect(result).toEqual(path.join(appDir, "src", "index.ts"));

				// @shared/* from app context should fail (not in app's paths)
				resolver.resolve({}, appDir, "@shared/utils/helper", {}, (err2) => {
					expect(err2).toBeInstanceOf(Error);
					done();
				});
			});
		});

		it("should resolve self-references within a referenced project", (done) => {
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
				expect(result).toEqual(
					path.join(sharedDir, "src", "utils", "helper.ts"),
				);
				done();
			});
		});

		it("should support explicit references array", (done) => {
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
					expect(result).toEqual(path.join(sharedSrcDir, "utils", "helper.ts"));
					done();
				},
			);
		});

		it("should not load references when references option is omitted", (done) => {
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
				expect(err).toBeInstanceOf(Error);
				done();
			});
		});

		it("should handle nested references (when a referenced project has its own references)", (done) => {
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
				expect(result).toEqual(path.join(utilsSrcDir, "core", "date.ts"));
				done();
			});
		});

		describe("modules resolution with references", () => {
			it("should resolve modules from main project's baseUrl", (done) => {
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
						expect(result).toEqual(
							path.join(appDir, "src", "components", "Button.ts"),
						);
						done();
					},
				);
			});

			it("should resolve modules from referenced project's baseUrl (self-reference)", (done) => {
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
						expect(result).toEqual(
							path.join(sharedSrcDir, "utils", "helper.ts"),
						);
						done();
					},
				);
			});

			it("should resolve components from referenced project's baseUrl", (done) => {
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
						expect(result).toEqual(
							path.join(sharedSrcDir, "components", "Input.ts"),
						);
						done();
					},
				);
			});

			it("should use correct baseUrl based on request context", (done) => {
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
					expect(result).toEqual(path.join(appDir, "src", "index.ts"));

					// From shared context, 'utils/helper' should resolve to shared/src/utils/helper
					resolver.resolve(
						{},
						path.join(sharedDir, "src"),
						"utils/helper",
						{},
						(err2, result2) => {
							if (err2) return done(err2);
							if (!result2) return done(new Error("No result from shared"));
							expect(result2).toEqual(
								path.join(sharedDir, "src", "utils", "helper.ts"),
							);
							done();
						},
					);
				});
			});

			it("should support explicit references with modules resolution", (done) => {
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
						expect(result).toEqual(
							path.join(sharedSrcDir, "utils", "helper.ts"),
						);
						done();
					},
				);
			});
		});
	});
});
