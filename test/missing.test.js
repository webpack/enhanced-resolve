"use strict";

const assert = require("assert");

const path = require("path");
const resolve = require("../");
const { describe, it } = require("./_runner");

describe("missing", () => {
	/**
	 * @type {[string, string, string[]][]}
	 */
	const testCases = [
		[
			path.join(__dirname, "fixtures"),
			"./missing-file",
			[
				path.join(__dirname, "fixtures", "missing-file"),
				path.join(__dirname, "fixtures", "missing-file.js"),
				path.join(__dirname, "fixtures", "missing-file.node"),
			],
		],
		[
			path.join(__dirname, "fixtures"),
			"missing-module",
			[
				path.join(__dirname, "fixtures", "node_modules", "missing-module"),
				path.join(__dirname, "..", "node_modules", "missing-module"),
			],
		],
		[
			path.join(__dirname, "fixtures"),
			"missing-module/missing-file",
			[
				path.join(__dirname, "fixtures", "node_modules", "missing-module"),
				path.join(__dirname, "..", "node_modules", "missing-module"),
			],
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
					"missing-file.js",
				),
				path.join(
					__dirname,
					"fixtures",
					"node_modules",
					"m1",
					"missing-file.node",
				),
				path.join(__dirname, "..", "node_modules", "m1"),
			],
		],
		[
			path.join(__dirname, "fixtures"),
			"m1/",
			[
				path.join(__dirname, "fixtures", "node_modules", "m1", "index"),
				path.join(__dirname, "fixtures", "node_modules", "m1", "index.js"),
				path.join(__dirname, "fixtures", "node_modules", "m1", "index.json"),
				path.join(__dirname, "fixtures", "node_modules", "m1", "index.node"),
			],
		],
		[
			path.join(__dirname, "fixtures"),
			"m1/a",
			[path.join(__dirname, "fixtures", "node_modules", "m1", "a")],
		],
	];
	for (const testCase of testCases) {
		it(`should tell about missing file when trying to resolve ${testCase[1]}`, (t, done) => {
			const missingDependencies = new Set();
			/**
			 * @param {Error | null} _err err
			 * @param {string} _filename _filename
			 */
			function callback(_err, _filename) {
				const actual = [...missingDependencies].sort();
				for (const dep of testCase[2]) {
					assert.ok(actual.includes(dep));
				}
				done();
			}
			resolve(testCase[0], testCase[1], { missingDependencies }, callback);
		});

		it(`should report error details exactly once when trying to resolve ${testCase[1]}`, (t, done) => {
			/**
			 * @param {Error & { details: string } | null} err err
			 * @param {string} _filename _filename
			 */
			function callback(err, _filename) {
				if (err) {
					const details = err.details.split("\n");
					const firstDetail = details.shift();

					assert.ok(firstDetail !== undefined);
					assert.ok(firstDetail.includes(testCase[1]));
					assert.ok(!details.includes(firstDetail));
				}

				done();
			}

			resolve(testCase[0], testCase[1], callback);
		});
	}
});
