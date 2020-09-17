var should = require("should");

var path = require("path");
var resolve = require("../");

describe("missing", function () {
	/**
	 * @type {Array<[string, string, Array<string>]>}
	 */
	var testCases = [
		[
			path.join(__dirname, "fixtures"),
			"./missing-file",
			[
				path.join(__dirname, "fixtures", "missing-file"),
				path.join(__dirname, "fixtures", "missing-file.js"),
				path.join(__dirname, "fixtures", "missing-file.node")
			]
		],
		[
			path.join(__dirname, "fixtures"),
			"missing-module",
			[
				path.join(__dirname, "fixtures", "node_modules", "missing-module"),
				path.join(__dirname, "..", "node_modules", "missing-module")
			]
		],
		[
			path.join(__dirname, "fixtures"),
			"missing-module/missing-file",
			[
				path.join(__dirname, "fixtures", "node_modules", "missing-module"),
				path.join(__dirname, "..", "node_modules", "missing-module")
			]
		],
		[
			path.join(__dirname, "fixtures"),
			"m1/missing-file",
			[
				path.join(__dirname, "fixtures", "node_modules", "m1", "missing-file"),
				path.join(
					__dirname,
					"fixtures",
					"node_modules",
					"m1",
					"missing-file.js"
				),
				path.join(
					__dirname,
					"fixtures",
					"node_modules",
					"m1",
					"missing-file.node"
				),
				path.join(__dirname, "..", "node_modules", "m1")
			]
		],
		[
			path.join(__dirname, "fixtures"),
			"m1/",
			[
				path.join(__dirname, "fixtures", "node_modules", "m1", "index"),
				path.join(__dirname, "fixtures", "node_modules", "m1", "index.js"),
				path.join(__dirname, "fixtures", "node_modules", "m1", "index.json"),
				path.join(__dirname, "fixtures", "node_modules", "m1", "index.node")
			]
		],
		[
			path.join(__dirname, "fixtures"),
			"m1/a",
			[path.join(__dirname, "fixtures", "node_modules", "m1", "a")]
		]
	];
	testCases.forEach(function (testCase) {
		it(
			"should tell about missing file when trying to resolve " + testCase[1],
			function (done) {
				var callback = function (err, filename) {
					Array.from(missingDependencies)
						.sort()
						.should.containDeep(testCase[2].sort());
					done();
				};
				const missingDependencies = new Set();
				resolve(testCase[0], testCase[1], { missingDependencies }, callback);
			}
		);
		it(
			"should report error details exactly once when trying to resolve " +
				testCase[1],
			function (done) {
				var callback = function (err, filename) {
					if (err) {
						var details = err.details.split("\n");
						var firstDetail = details.shift();
						should.notEqual(firstDetail.indexOf(testCase[1]), -1);
						details.should.not.containDeep([firstDetail]);
					}
					done();
				};
				resolve(testCase[0], testCase[1], callback);
			}
		);
	});
});
