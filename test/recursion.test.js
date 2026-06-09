"use strict";

const assert = require("assert");
const fs = require("fs");

const path = require("path");
const { CachedInputFileSystem, ResolverFactory } = require("../");
const { describe, it } = require("./_runner");

const fixtures = path.join(__dirname, "fixtures");
const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

describe("recursion detection", () => {
	it("surfaces a recursion error when a plugin re-invokes doResolve on the same hook/request", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			extensions: [".js"],
			plugins: [
				{
					apply(r) {
						r.hooks.resolve.tapAsync("ForceRecursion", (req, ctx, cb) => {
							// Manually re-call doResolve on the same hook to trigger the
							// recursion guard in doResolve.
							r.doResolve(r.hooks.resolve, req, "force", ctx, cb);
						});
					},
				},
			],
		});

		resolver.resolve({}, fixtures, "./a.js", {}, (err) => {
			assert.ok(err instanceof Error);
			// The recursion error may be wrapped; either shape is acceptable.
			const msg = /** @type {Error} */ (err).message;
			assert.strictEqual(
				/Recursion in resolving|Can't resolve/.test(msg),
				true,
			);
			done();
		});
	});

	it("logs 'abort resolving because of recursion' when a log is provided", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			extensions: [".js"],
			plugins: [
				{
					apply(r) {
						r.hooks.resolve.tapAsync("ForceRecursion2", (req, ctx, cb) => {
							r.doResolve(r.hooks.resolve, req, "force", ctx, cb);
						});
					},
				},
			],
		});

		const log = [];
		resolver.resolve(
			{},
			fixtures,
			"./a.js",
			{ log: (m) => log.push(m) },
			(err) => {
				assert.ok(err instanceof Error);
				assert.strictEqual(
					log.some((l) => l.includes("abort resolving because of recursion")),
					true,
				);
				done();
			},
		);
	});
});
