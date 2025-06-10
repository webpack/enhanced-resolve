"use strict";

const { CachedInputFileSystem } = require("../");

describe("pr-53", () => {
	it("should allow to readJsonSync in CachedInputFileSystem", () => {
		const cfs = new CachedInputFileSystem(
			{
				// @ts-expect-error for tests
				readFileSync(path) {
					return JSON.stringify(`abc${path}`);
				},
			},
			1000,
		);
		if (!cfs.readJsonSync) throw new Error("readJsonSync must be available");
		expect(cfs.readJsonSync("xyz")).toBe("abcxyz");
	});
});
