const path = require("path");
const resolve = require("../");
const { transferPathToPosix, obps } = require("./util/path-separator");

describe("missing", function () {
	/**
	 * @type {Array<[string, string, Array<string>]>}
	 */
	const testCases = [
		[
			path.join(__dirname, "fixtures"),
			`.${obps}missing-file`,
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
			`missing-module${obps}missing-file`,
			[
				path.join(__dirname, "fixtures", "node_modules", "missing-module"),
				path.join(__dirname, "..", "node_modules", "missing-module")
			]
		],
		[
			path.join(__dirname, "fixtures"),
			`m1${obps}missing-file`,
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
			`m1${obps}`,
			[
				path.join(__dirname, "fixtures", "node_modules", "m1", "index"),
				path.join(__dirname, "fixtures", "node_modules", "m1", "index.js"),
				path.join(__dirname, "fixtures", "node_modules", "m1", "index.json"),
				path.join(__dirname, "fixtures", "node_modules", "m1", "index.node")
			]
		],
		[
			path.join(__dirname, "fixtures"),
			`m1${obps}a`,
			[path.join(__dirname, "fixtures", "node_modules", "m1", "a")]
		]
	];
	testCases.forEach(function (testCase) {
		it(
			"should tell about missing file when trying to resolve " + testCase[1],
			done => {
				const callback = function (err, filename) {
					expect(Array.from(missingDependencies).sort()).toEqual(
						expect.arrayContaining(testCase[2].map(transferPathToPosix).sort())
					);
					done();
				};
				const missingDependencies = new Set();
				resolve(testCase[0], testCase[1], { missingDependencies }, callback);
			}
		);
		it(
			"should report error details exactly once when trying to resolve " +
				testCase[1],
			done => {
				const callback = function (err, filename) {
					if (err) {
						const details = err.details.split("\n");
						const firstDetail = details.shift();

						expect(firstDetail).toContain(transferPathToPosix(testCase[1]));
						expect(details).not.toContain(firstDetail);
					}
					done();
				};
				resolve(testCase[0], testCase[1], callback);
			}
		);
	});
});
