"use strict";

const assert = require("assert");
const fs = require("fs");
const { describe, it } = require("node:test");

const path = require("path");
const {
	CachedInputFileSystem,
	CloneBasenamePlugin,
	ResolverFactory,
} = require("../");

describe("plugins", () => {
	it("should resolve with the CloneBasenamePlugin", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: require("fs"),
			plugins: [
				new CloneBasenamePlugin(
					"after-existing-directory",
					"undescribed-raw-file",
				),
			],
		});

		resolver.resolve(
			{},
			__dirname,
			"./fixtures/directory-default",
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				assert.deepStrictEqual(
					result,
					path.resolve(
						__dirname,
						"fixtures/directory-default/directory-default.js",
					),
				);
				done();
			},
		);
	});

	it("should ignore 'false'/'null'/'undefined' plugins", (t, done) => {
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
					"undescribed-raw-file",
				),
			],
		});

		resolver.resolve(
			{},
			__dirname,
			"./fixtures/directory-default",
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				assert.deepStrictEqual(
					result,
					path.resolve(
						__dirname,
						"fixtures/directory-default/directory-default.js",
					),
				);
				done();
			},
		);
	});

	it("function-style plugins are invoked during createResolver with the resolver instance", () => {
		const nodeFileSystem = new CachedInputFileSystem(fs, 4000);
		let seenResolver;
		const r = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			plugins: [
				function fnPlugin(resolver) {
					seenResolver = resolver;
				},
			],
		});
		assert.strictEqual(seenResolver, r);
	});
});
