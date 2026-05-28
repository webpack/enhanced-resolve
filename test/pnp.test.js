"use strict";

const assert = require("assert");
const fs = require("fs");
const { after, before, beforeEach, describe, it } = require("node:test");

const path = require("path");
const { CachedInputFileSystem, ResolverFactory } = require("../");

const nodeFileSystem = new CachedInputFileSystem(fs, 4000);
const fixture = path.resolve(__dirname, "fixtures", "pnp");

let isAdmin = false;

try {
	fs.symlinkSync("dir", path.resolve(fixture, "pkg/symlink"), "dir");
	isAdmin = true;
} catch (_err) {
	// ignore
}
try {
	fs.unlinkSync(path.resolve(fixture, "pkg/symlink"));
} catch (_err) {
	isAdmin = false;
	// ignore
}

describe("pnp", () => {
	let pnpApi;
	let resolverFuzzy;
	let resolver;

	if (isAdmin) {
		before(() => {
			fs.symlinkSync("dir", path.resolve(fixture, "pkg/symlink"), "dir");
		});
	}

	beforeEach(() => {
		// eslint-disable-next-line jsdoc/reject-any-type
		pnpApi = /** @type {any} */ ({
			mocks: new Map(),
			ignoredIssuers: new Set(),
			resolveToUnqualified(request, issuer) {
				if (pnpApi.ignoredIssuers.has(issuer)) {
					return null;
				} else if (pnpApi.mocks.has(request)) {
					return pnpApi.mocks.get(request);
				}
				const err =
					/** @type {Error & { code: string, pnpCode: string }} */
					(new Error("No way"));
				err.code = "MODULE_NOT_FOUND";
				err.pnpCode = "UNDECLARED_DEPENDENCY";
				throw err;
			},
		});
		resolverFuzzy = ResolverFactory.createResolver({
			extensions: [".ts", ".js"],
			aliasFields: ["browser"],
			fileSystem: nodeFileSystem,
			alias: {
				alias: path.resolve(fixture, "pkg"),
			},
			pnpApi,
			modules: ["node_modules", path.resolve(fixture, "../pnp-a")],
		});
		resolver = ResolverFactory.createResolver({
			aliasFields: ["browser"],
			fileSystem: nodeFileSystem,
			fullySpecified: true,
			alias: {
				alias: path.resolve(fixture, "pkg"),
			},
			pnpApi,
			modules: [
				"alternative-modules",
				"node_modules",
				path.resolve(fixture, "../pnp-a"),
			],
		});
	});

	if (isAdmin) {
		after(() => {
			fs.unlinkSync(path.resolve(fixture, "pkg/symlink"));
		});
	}

	it("should resolve by going through the pnp api", (t, done) => {
		pnpApi.mocks.set("pkg", path.resolve(fixture, "pkg"));
		resolver.resolve({}, __dirname, "pkg/dir/index.js", {}, (err, result) => {
			if (err) return done(err);
			assert.deepStrictEqual(result, path.resolve(fixture, "pkg/dir/index.js"));
			done();
		});
	});

	it("should not resolve a not fully specified request when fullySpecified is set", (t, done) => {
		pnpApi.mocks.set("pkg", path.resolve(fixture, "pkg"));
		resolver.resolve({}, __dirname, "pkg/dir/index", {}, (err, _result) => {
			assert.ok(err instanceof Error);
			done();
		});
	});

	it("should track dependency to the pnp api", (t, done) => {
		pnpApi.mocks.set("pkg", path.resolve(fixture, "pkg"));
		pnpApi.mocks.set("pnpapi", path.resolve(fixture, ".pnp.js"));
		const fileDependencies = new Set();
		resolver.resolve(
			{},
			__dirname,
			"pkg/dir/index.js",
			{ fileDependencies },
			(err, result) => {
				if (err) return done(err);
				assert.deepStrictEqual(
					result,
					path.resolve(fixture, "pkg/dir/index.js"),
				);
				assert.ok(
					[...fileDependencies].includes(path.resolve(fixture, ".pnp.js")),
				);
				done();
			},
		);
	});

	it("should resolve module names with package.json", (t, done) => {
		pnpApi.mocks.set("pkg", path.resolve(fixture, "pkg"));
		resolver.resolve({}, __dirname, "pkg", {}, (err, result) => {
			if (err) return done(err);
			assert.deepStrictEqual(result, path.resolve(fixture, "pkg/main.js"));
			done();
		});
	});

	it("should resolve namespaced module names", (t, done) => {
		pnpApi.mocks.set("@user/pkg", path.resolve(fixture, "pkg"));
		resolver.resolve({}, __dirname, "@user/pkg", {}, (err, result) => {
			if (err) return done(err);
			assert.deepStrictEqual(result, path.resolve(fixture, "pkg/main.js"));
			done();
		});
	});

	it(
		"should not resolve symlinks",
		isAdmin
			? (t, done) => {
					pnpApi.mocks.set("pkg", path.resolve(fixture, "pkg"));
					resolverFuzzy.resolve(
						{},
						__dirname,
						"pkg/symlink",
						{},
						(err, result) => {
							if (err) return done(err);
							assert.deepStrictEqual(
								result,
								path.resolve(fixture, "pkg/symlink/index.js"),
							);
							done();
						},
					);
				}
			: undefined,
	);

	it("should properly deal with other extensions", (t, done) => {
		pnpApi.mocks.set("@user/pkg", path.resolve(fixture, "pkg"));
		resolverFuzzy.resolve(
			{},
			__dirname,
			"@user/pkg/typescript",
			{},
			(err, result) => {
				if (err) return done(err);
				assert.deepStrictEqual(
					result,
					path.resolve(fixture, "pkg/typescript/index.ts"),
				);
				done();
			},
		);
	});

	it("should properly deal package.json alias", (t, done) => {
		pnpApi.mocks.set("pkg", path.resolve(fixture, "pkg"));
		resolverFuzzy.resolve(
			{},
			__dirname,
			"pkg/package-alias",
			{},
			(err, result) => {
				if (err) return done(err);
				assert.deepStrictEqual(
					result,
					path.resolve(fixture, "pkg/package-alias/browser.js"),
				);
				done();
			},
		);
	});

	it("should prefer pnp resolves over normal modules", (t, done) => {
		pnpApi.mocks.set("m1", path.resolve(fixture, "../node_modules/m2"));
		resolver.resolve(
			{},
			path.resolve(__dirname, "fixtures"),
			"m1/b.js",
			{},
			(err, result) => {
				if (err) return done(err);
				assert.deepStrictEqual(
					result,
					path.resolve(fixture, "../node_modules/m2/b.js"),
				);
				done();
			},
		);
	});

	it("should prefer alternative module directories over pnp", (t, done) => {
		pnpApi.mocks.set("m1", path.resolve(fixture, "../node_modules/m2"));
		resolver.resolve(
			{},
			path.resolve(__dirname, "fixtures/prefer-pnp"),
			"m1/b.js",
			{},
			(err, result) => {
				if (err) return done(err);
				assert.deepStrictEqual(
					result,
					path.resolve(
						__dirname,
						"fixtures/prefer-pnp/alternative-modules/m1/b.js",
					),
				);
				done();
			},
		);
	});

	it("should prefer alias over pnp resolves", (t, done) => {
		pnpApi.mocks.set("alias", path.resolve(fixture, "pkg/dir"));
		resolver.resolve(
			{},
			path.resolve(__dirname, "fixtures"),
			"alias/index.js",
			{},
			(err, result) => {
				if (err) return done(err);
				assert.deepStrictEqual(result, path.resolve(fixture, "pkg/index.js"));
				done();
			},
		);
	});

	it("should prefer pnp over modules after node_modules", (t, done) => {
		pnpApi.mocks.set("m2", path.resolve(fixture, "pkg"));
		resolver.resolve(
			{},
			path.resolve(__dirname, "fixtures"),
			"m2/index.js",
			{},
			(err, result) => {
				if (err) return done(err);
				assert.deepStrictEqual(result, path.resolve(fixture, "pkg/index.js"));
				done();
			},
		);
	});

	it("should fallback to alternatives when pnp resolving fails", (t, done) => {
		resolver.resolve(
			{},
			path.resolve(__dirname, "fixtures"),
			"m2/a.js",
			{},
			(err, result) => {
				if (err) return done(err);
				assert.deepStrictEqual(
					result,
					path.resolve(fixture, "../pnp-a/m2/a.js"),
				);
				done();
			},
		);
	});

	it("should fallback to alternatives when pnp doesn't manage the issuer", (t, done) => {
		pnpApi.ignoredIssuers.add(`${path.resolve(__dirname, "fixtures")}/`);
		// Add the wrong path on purpose to make sure the issuer is ignored
		pnpApi.mocks.set("m2", path.resolve(fixture, "pkg"));
		resolver.resolve(
			{},
			path.resolve(__dirname, "fixtures"),
			"m2/b.js",
			{},
			(err, result) => {
				if (err) return done(err);
				assert.deepStrictEqual(
					result,
					path.resolve(__dirname, "fixtures/node_modules/m2/b.js"),
				);
				done();
			},
		);
	});

	it("should handle the exports field when using PnP", (t, done) => {
		pnpApi.mocks.set("m1", path.resolve(fixture, "pkg3"));
		resolver.resolve(
			{},
			path.resolve(__dirname, "fixtures"),
			"m1",
			{},
			(err, result) => {
				if (err) return done(err);
				assert.deepStrictEqual(result, path.resolve(fixture, "pkg3/a.js"));
				done();
			},
		);
	});

	it("should handle the exports field when using PnP (with sub path)", (t, done) => {
		pnpApi.mocks.set("@user/m1", path.resolve(fixture, "pkg3"));
		resolver.resolve(
			{},
			path.resolve(__dirname, "fixtures"),
			"@user/m1/x",
			{},
			(err, result) => {
				if (err) return done(err);
				assert.deepStrictEqual(result, path.resolve(fixture, "pkg3/a.js"));
				done();
			},
		);
	});

	it("falls through when pnpApi throws an UNDECLARED_DEPENDENCY error and logs each line", (t, done) => {
		const pnpApi = {
			resolveToUnqualified() {
				const err =
					/** @type {Error & { code: string, pnpCode: string }} */
					(new Error("line-1\nline-2"));
				err.code = "MODULE_NOT_FOUND";
				err.pnpCode = "UNDECLARED_DEPENDENCY";
				throw err;
			},
		};
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			pnpApi,
			modules: ["node_modules", path.resolve(fixture, "../pnp-a")],
		});
		const logs = [];
		resolver.resolve(
			{},
			path.resolve(__dirname, "fixtures"),
			"m2/a.js",
			{ log: (m) => logs.push(m) },
			(err, result) => {
				if (err) return done(err);
				assert.deepStrictEqual(
					result,
					path.resolve(fixture, "../pnp-a/m2/a.js"),
				);
				assert.strictEqual(
					logs.some((l) => l.includes("request is not managed by the pnpapi")),
					true,
				);
				done();
			},
		);
	});

	it("propagates unexpected errors from pnpApi", (t, done) => {
		const pnpApi = {
			resolveToUnqualified() {
				throw new Error("unexpected-pnp");
			},
		};
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			pnpApi,
			modules: ["node_modules", path.resolve(fixture, "../pnp-a")],
		});
		resolver.resolve(
			{},
			path.resolve(__dirname, "fixtures"),
			"m2/a.js",
			{},
			(err) => {
				assert.ok(err);
				assert.strictEqual(
					/** @type {Error} */ (err).message,
					"unexpected-pnp",
				);
				done();
			},
		);
	});

	it("returns an error when neither pnp nor the alternate find a result", (t, done) => {
		const pnpApi = {
			resolveToUnqualified() {
				return null;
			},
		};
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			pnpApi,
			modules: ["node_modules"],
		});
		resolver.resolve(
			{},
			path.resolve(__dirname, "fixtures"),
			"no-such-package",
			{},
			(err) => {
				assert.ok(err instanceof Error);
				done();
			},
		);
	});

	it("attempts the process.versions.pnp auto-detection path", () => {
		// eslint-disable-next-line jsdoc/reject-any-type
		const { pnp: originalPnp } = /** @type {any} */ (process.versions);
		try {
			Object.defineProperty(process.versions, "pnp", {
				value: "0.0.0",
				configurable: true,
			});
			assert.doesNotThrow(() =>
				ResolverFactory.createResolver({ fileSystem: nodeFileSystem }),
			);
		} finally {
			if (originalPnp === undefined) {
				// eslint-disable-next-line jsdoc/reject-any-type
				delete (/** @type {any} */ (process.versions).pnp);
			} else {
				Object.defineProperty(process.versions, "pnp", {
					value: originalPnp,
					configurable: true,
				});
			}
		}
	});
});
