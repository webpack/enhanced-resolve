"use strict";

const assert = require("assert");
const { CachedInputFileSystem } = require("../");
const { describe, it } = require("./_runner");

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
		assert.strictEqual(cfs.readJsonSync("xyz"), "abcxyz");
	});
});
