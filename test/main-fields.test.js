"use strict";

const fs = require("fs");
const { CachedInputFileSystem, ResolverFactory } = require("../");

const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

describe("mainFields normalization", () => {
	it("normalizes a bare string entry", () => {
		const r = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			mainFields: ["main"],
		});
		expect(r.options.mainFields).toEqual([
			{ name: ["main"], forceRelative: true },
		]);
	});

	it("normalizes an array entry", () => {
		const r = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			mainFields: [["browser", "main"]],
		});
		expect(r.options.mainFields).toEqual([
			{ name: ["browser", "main"], forceRelative: true },
		]);
	});

	it("preserves forceRelative on object entries with a string name", () => {
		const r = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			mainFields: [{ name: "main", forceRelative: false }],
		});
		expect(r.options.mainFields).toEqual([
			{ name: ["main"], forceRelative: false },
		]);
	});

	it("preserves object entries with an array name", () => {
		const r = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			mainFields: [{ name: ["a", "b"], forceRelative: true }],
		});
		expect(r.options.mainFields).toEqual([
			{ name: ["a", "b"], forceRelative: true },
		]);
	});
});
