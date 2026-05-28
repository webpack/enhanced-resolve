"use strict";

const assert = require("assert");
const fs = require("fs");
const { describe, it } = require("node:test");

const path = require("path");
const { CachedInputFileSystem, ResolverFactory } = require("../");

const fixtures = path.join(__dirname, "fixtures", "incorrect-package");
const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

/**
 * @param {string[]} args args
 * @returns {string} paths
 */
function p(...args) {
	return path.join(fixtures, ...args);
}

describe("incorrect description file", () => {
	const resolver = ResolverFactory.createResolver({
		useSyncFileSystemCalls: true,
		fileSystem: nodeFileSystem,
	});

	it("should not resolve main in incorrect description file #1", (t, done) => {
		let called = false;
		const ctx = {
			fileDependencies: new Set(),
			log: () => {
				called = true;
			},
		};
		resolver.resolve({}, p("pack1"), ".", ctx, (err, _result) => {
			if (!err) return done(new Error("No error"));
			assert.ok(err instanceof Error);
			assert.strictEqual(
				ctx.fileDependencies.has(p("pack1", "package.json")),
				true,
			);
			assert.strictEqual(called, true);
			done();
		});
	});

	it("should not resolve main in incorrect description file #2", (t, done) => {
		let called = false;
		const ctx = {
			fileDependencies: new Set(),
			log: () => {
				called = true;
			},
		};
		resolver.resolve({}, p("pack2"), ".", ctx, (err, _result) => {
			if (!err) return done(new Error("No error"));
			assert.strictEqual(
				ctx.fileDependencies.has(p("pack2", "package.json")),
				true,
			);
			assert.strictEqual(called, true);
			done();
		});
	});

	it("should not resolve main in incorrect description file #3", (t, done) => {
		resolver.resolve({}, p("pack2"), ".", {}, (err, _result) => {
			if (!err) return done(new Error("No error"));
			assert.ok(err instanceof Error);
			done();
		});
	});
});
