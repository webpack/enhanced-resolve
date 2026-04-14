"use strict";

const resolve = require("../");

describe("index exports", () => {
	it("exposes top-level resolve helpers", () => {
		expect(typeof resolve).toBe("function");
		expect(typeof resolve.sync).toBe("function");
		expect(typeof resolve.create).toBe("function");
		expect(typeof resolve.create.sync).toBe("function");
	});

	it("lazily exposes ResolverFactory and CachedInputFileSystem", () => {
		expect(resolve.ResolverFactory).toBeDefined();
		expect(typeof resolve.CachedInputFileSystem).toBe("function");
	});

	it("lazily exposes plugin classes via getters", () => {
		expect(typeof resolve.CloneBasenamePlugin).toBe("function");
		expect(typeof resolve.LogInfoPlugin).toBe("function");
		expect(typeof resolve.TsconfigPathsPlugin).toBe("function");
	});

	it("lazily exposes forEachBail utility", () => {
		expect(typeof resolve.forEachBail).toBe("function");
	});

	it("frozen module.exports cannot be mutated", () => {
		expect(() => {
			// @ts-expect-error frozen object
			resolve.someProp = 1;
		}).toThrow(/object is not extensible|read only|Cannot add property/);
	});
});
