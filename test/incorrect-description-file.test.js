"use strict";

const fs = require("fs");
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

	it("should not resolve main in incorrect description file #1", (done) => {
		let called = false;
		const ctx = {
			fileDependencies: new Set(),
			log: () => {
				called = true;
			},
		};
		resolver.resolve({}, p("pack1"), ".", ctx, (err, _result) => {
			if (!err) return done(new Error("No error"));
			expect(err).toBeInstanceOf(Error);
			expect(ctx.fileDependencies.has(p("pack1", "package.json"))).toBe(true);
			expect(called).toBe(true);
			done();
		});
	});

	it("should not resolve main in incorrect description file #2", (done) => {
		let called = false;
		const ctx = {
			fileDependencies: new Set(),
			log: () => {
				called = true;
			},
		};
		resolver.resolve({}, p("pack2"), ".", ctx, (err, _result) => {
			if (!err) return done(new Error("No error"));
			expect(ctx.fileDependencies.has(p("pack2", "package.json"))).toBe(true);
			expect(called).toBe(true);
			done();
		});
	});

	it("should not resolve main in incorrect description file #3", (done) => {
		resolver.resolve({}, p("pack2"), ".", {}, (err, _result) => {
			if (!err) return done(new Error("No error"));
			expect(err).toBeInstanceOf(Error);
			done();
		});
	});
});
