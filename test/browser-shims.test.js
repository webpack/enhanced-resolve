"use strict";

// Smoke tests for the browser-only shims in lib/util. They replace Node-only
// modules when this package is consumed in a bundler that respects the
// "browser" field in package.json, so they have no integration path.

describe("browser shims", () => {
	it("process-browser exposes versions and a promise-based nextTick", (done) => {
		const processBrowser = require("../lib/util/process-browser");

		expect(processBrowser.versions).toEqual({});
		processBrowser.nextTick(
			(a, b) => {
				expect(a).toBe(1);
				expect(b).toBe(2);
				done();
			},
			1,
			2,
		);
	});

	it("module-browser is an empty object", () => {
		const moduleBrowser = require("../lib/util/module-browser");

		expect(moduleBrowser).toEqual({});
	});
});
