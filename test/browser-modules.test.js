"use strict";

describe("browser util modules", () => {
	it("exposes a nextTick shim and versions on process-browser", (done) => {
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

	it("exports an object from module-browser", () => {
		const moduleBrowser = require("../lib/util/module-browser");

		expect(moduleBrowser).toEqual({});
	});
});

// cspell:ignore Hierachic
describe("deprecated ModulesInHierachicDirectoriesPlugin alias", () => {
	it("re-exports ModulesInHierarchicalDirectoriesPlugin", () => {
		const alias = require("../lib/ModulesInHierachicDirectoriesPlugin");
		const target = require("../lib/ModulesInHierarchicalDirectoriesPlugin");

		expect(alias).toBe(target);
	});
});
