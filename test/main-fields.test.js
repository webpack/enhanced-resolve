"use strict";

const assert = require("assert");
const fs = require("fs");
const { CachedInputFileSystem, ResolverFactory } = require("../");
const { describe, it } = require("./_runner");

const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

describe("mainFields normalization", () => {
	it("normalizes a bare string entry", () => {
		const r = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			mainFields: ["main"],
		});
		assert.deepStrictEqual(r.options.mainFields, [
			{ name: ["main"], forceRelative: true },
		]);
	});

	it("normalizes an array entry", () => {
		const r = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			mainFields: [["browser", "main"]],
		});
		assert.deepStrictEqual(r.options.mainFields, [
			{ name: ["browser", "main"], forceRelative: true },
		]);
	});

	it("preserves forceRelative on object entries with a string name", () => {
		const r = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			mainFields: [{ name: "main", forceRelative: false }],
		});
		assert.deepStrictEqual(r.options.mainFields, [
			{ name: ["main"], forceRelative: false },
		]);
	});

	it("preserves object entries with an array name", () => {
		const r = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			mainFields: [{ name: ["a", "b"], forceRelative: true }],
		});
		assert.deepStrictEqual(r.options.mainFields, [
			{ name: ["a", "b"], forceRelative: true },
		]);
	});
});
