require("should");

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
			error.should.be.instanceof(Error);
			error.message.should.match(/Trying to access out of package scope/);
			done();
		});
	});
});
