var resolve = require("../");
var path = require("path");
var should = require("should");

describe("missing", function() {
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
				path.join(
					__dirname,
					"fixtures",
					"node_modules",
					"missing-module",
					"missing-file.js"
				),
				path.join(
					__dirname,
					"..",
					"node_modules",
					"missing-module",
					"missing-file"
				)
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
				path.join(__dirname, "..", "node_modules", "m1", "missing-file")
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
	testCases.forEach(function(testCase) {
		it(
			"should tell about missing file when trying to resolve " + testCase[1],
			function(done) {
				var callback = function(err, filename) {
					if (err) {
						err.missing.sort().should.containDeep(testCase[2].sort());
						Array.from(callback.missing)
							.sort()
							.should.containDeep(testCase[2].sort());
						resolve(testCase[0], testCase[1], function(err) {
							err.missing.sort().should.containDeep(testCase[2].sort());
							done();
						});
						return;
					}
					Array.from(callback.missing)
						.sort()
						.should.containDeep(testCase[2].sort());
					done();
				};
				callback.missing = new Set();
				resolve(testCase[0], testCase[1], callback);
			}
		);
		it(
			"should tell about missing file in the callback's error object when trying to resolve " +
				testCase[1],
			function(done) {
				var callback = function(err, filename) {
					if (err) {
						err.missing.sort().should.containDeep(testCase[2].sort());
						resolve(testCase[0], testCase[1], function(err) {
							err.missing.sort().should.containDeep(testCase[2].sort());
							done();
						});
						return;
					}
					done();
				};
				resolve(testCase[0], testCase[1], callback);
			}
		);
		it(
			"should report error details exactly once when trying to resolve " +
				testCase[1],
			function(done) {
				var callback = function(err, filename) {
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
		it(
			"should report missing files exactly once when trying to resolve " +
				testCase[1],
			function(done) {
				var callback = function(err, filename) {
					if (err) {
						var missing = err.missing.sort();
						var isSame = true;
						for (var i = 0; i < missing.length - 1; i += 2) {
							isSame = isSame && missing[i] === missing[i + 1];
						}
						isSame.should.not.be.true(
							"missing file names should not be repeated"
						);
					}
					done();
				};
				resolve(testCase[0], testCase[1], callback);
			}
		);
		it(
			"should tell about missing file when trying to resolve sync " +
				testCase[1],
			function() {
				try {
					resolve.sync(testCase[0], testCase[1]);
				} catch (err) {
					err.missing.sort().should.containDeep(testCase[2].sort());
				}
			}
		);
	});
});
