const { checkImportsExportsFieldTarget } = require("../lib/util/path");

describe("checkImportsExportsFieldTarget", () => {
	/**
	 * @type {string[]}
	 */
	const errorCases = [
		"../a.js",
		"../",
		"./a/b/../../../c.js",
		"./a/b/../../../",
		"./../../c.js",
		"./../../",
		"./a/../b/../../c.js",
		"./a/../b/../../",
		"./././../"
	];

	errorCases.forEach(case_ => {
		it(case_, done => {
			const error = checkImportsExportsFieldTarget(case_);
			if (!error) return done("expect error");

			expect(error).toBeInstanceOf(Error);
			expect(error.message).toMatch(/Trying to access out of package scope/);
			done();
		});
	});
});
