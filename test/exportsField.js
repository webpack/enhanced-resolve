const should = require("should");
const processExportsField = require("../lib/processExportsField");

/** @typedef {import("../lib/processExportsField").ExportField} ExportField */

describe("Exports field", function exportsField() {
	/** @type {Array<{name: string, expect: string[]|Error, suite: [ExportField, string, string[]]}>} */
	const testCases = [
		//#region Samples
		{
			name: "sample #1",
			expect: ["./dist/test/file.js", "./src/test/file.js"],
			suite: [
				{
					"./foo/": {
						import: ["./dist/", "./src/"],
						webpack: "./wp/"
					},
					".": "./main.js"
				},
				"./foo/test/file.js",
				["import", "webpack"]
			]
		},
		{
			name: "sample #2",
			expect: ["./data/timezones/pdt.mjs"],
			suite: [
				{
					"./timezones/": "./data/timezones/"
				},
				"./timezones/pdt.mjs",
				[]
			]
		},
		{
			name: "sample #3",
			// mapping works like concatenating strings not file paths
			expect: ["./data/timezones/timezones/pdt.mjs"],
			suite: [
				{
					"./": "./data/timezones/"
				},
				"./timezones/pdt.mjs",
				[]
			]
		},
		{
			name: "sample #4",
			expect: [],
			suite: [
				{
					"./lib/": {
						browser: ["./browser/"]
					},
					"./dist/index.js": {
						node: "./index.js"
					}
				},
				"./dist/index.js",
				["browser"]
			]
		},
		{
			name: "sample #5",
			expect: ["./browser/index.js"], // default condition used
			suite: [
				{
					"./lib/": {
						browser: ["./browser/"]
					},
					"./dist/index.js": {
						node: "./index.js",
						default: "./browser/index.js"
					}
				},
				"./dist/index.js",
				["browser"]
			]
		},
		{
			name: "sample #6",
			expect: ["./main.js"],
			suite: ["./main.js", ".", []]
		},
		{
			name: "sample #7",
			expect: [],
			suite: ["./main.js", "./lib.js", []]
		},
		{
			name: "sample #8",
			expect: [],
			suite: [
				{
					"./dist/a": "./dist/index.js"
				},
				"./dist/aaa",
				[]
			]
		},
		{
			name: "sample #9",
			expect: [],
			suite: [
				{
					"./dist/a/a/": "./dist/index.js"
				},
				"./dist/a/a",
				[]
			]
		},
		{
			name: "sample #10",
			expect: [],
			suite: [
				{
					".": "./index.js"
				},
				"./timezones/pdt.mjs",
				[]
			]
		},
		//#endregion

		//#region Direct mapping
		{
			name: "Direct mapping #1",
			expect: ["./dist/index.js"],
			suite: [
				{
					".": "./dist/index.js"
				},
				".",
				[]
			]
		},
		{
			name: "Direct mapping #2",
			expect: [],
			suite: [
				{
					"./": "./",
					"./dist/index.js": "./dist/index.js"
				},
				".",
				[]
			]
		},
		{
			name: "Direct mapping #3",
			expect: ["./dist/a.js"], // direct mapping is more prioritize
			suite: [
				{
					"./dist/": "./dist/",
					"./dist/index.js": "./dist/a.js"
				},
				"./dist/index.js",
				[]
			]
		},
		{
			name: "Direct mapping #4",
			expect: ["./index.js"], // direct mapping is more prioritize
			suite: [
				{
					"./": {
						browser: ["./browser/"]
					},
					"./dist/index.js": {
						browser: "./index.js"
					}
				},
				"./dist/index.js",
				["browser"]
			]
		},
		{
			name: "Direct mapping #5",
			// direct mapping is more prioritize,
			// so there is no match
			expect: [],
			suite: [
				{
					"./": {
						browser: ["./browser/"]
					},
					"./dist/index.js": {
						node: "./node.js"
					}
				},
				"./dist/index.js",
				["browser"]
			]
		},
		{
			name: "Direct mapping #6",
			expect: ["./index.js"],
			suite: [
				{
					".": {
						browser: "./index.js",
						node: "./src/node/index.js",
						default: "./src/index.js"
					}
				},
				".",
				["browser"]
			]
		},
		{
			name: "Direct mapping #7",
			expect: new Error(), // Default is first one
			suite: [
				{
					".": {
						default: "./src/index.js",
						browser: "./index.js",
						node: "./src/node/index.js"
					}
				},
				".",
				["browser"]
			]
		},
		{
			name: "Direct mapping #8",
			expect: ["./src/index.js"],
			suite: [
				{
					".": {
						browser: "./index.js",
						node: "./src/node/index.js",
						default: "./src/index.js"
					}
				},
				".",
				[]
			]
		},
		{
			name: "Direct mapping #9",
			expect: ["./index"], // it is fine, file may not have extension
			suite: [
				{
					".": "./index"
				},
				".",
				[]
			]
		},
		{
			name: "Direct mapping #10",
			expect: ["./index.js"],
			suite: [
				{
					"./index": "./index.js"
				},
				"./index",
				[]
			]
		},
		//#endregion

		//#region When mapping to a folder root, both the left and right sides must end in slashes
		{
			name: "mapping to a folder root #1",
			expect: [],
			suite: [
				{
					"./timezones": "./data/timezones/"
				},
				"./timezones/pdt.mjs",
				[]
			]
		},
		{
			name: "mapping to a folder root #2",
			expect: new Error(), // incorrect export field
			suite: [
				{
					"./timezones/": "./data/timezones"
				},
				"./timezones/pdt.mjs",
				[]
			]
		},
		{
			name: "mapping to a folder root #3",
			expect: ["./data/timezones/pdt/index.mjs"],
			suite: [
				{
					"./timezones/pdt/": "./data/timezones/pdt/"
				},
				"./timezones/pdt/index.mjs",
				[]
			]
		},
		{
			name: "mapping to a folder root #4",
			expect: ["./timezones/pdt.mjs"],
			suite: [
				{
					"./": "./timezones/"
				},
				"./pdt.mjs",
				[]
			]
		},
		{
			name: "mapping to a folder root #5",
			expect: ["./timezones/pdt.mjs"],
			suite: [
				{
					"./": "./"
				},
				"./timezones/pdt.mjs",
				[]
			]
		},
		{
			name: "mapping to a folder root #6",
			expect: new Error(), // not a folder mapping
			suite: [
				{
					"./": "."
				},
				"./timezones/pdt.mjs",
				[]
			]
		},
		{
			name: "mapping to a folder root #7",
			expect: [], // incorrect export field, but value did not processed
			suite: [
				{
					".": "./"
				},
				"./timezones/pdt.mjs",
				[]
			]
		},
		//#endregion

		//#region The longest matching path prefix is prioritized
		{
			name: "the longest matching path prefix is prioritized #1",
			// it does not work same as conditional mapping,
			// so there is no match for ./dist/index.mjs
			expect: ["./lib/index.mjs"],
			suite: [
				{
					"./": "./",
					"./dist/": "./lib/"
				},
				"./dist/index.mjs",
				[]
			]
		},
		{
			name: "the longest matching path prefix is prioritized #2",
			expect: ["./dist/utils/index.js"],
			suite: [
				{
					"./dist/utils/": "./dist/utils/",
					"./dist/": "./lib/"
				},
				"./dist/utils/index.js",
				[]
			]
		},
		{
			name: "the longest matching path prefix is prioritized #3",
			// direct mapping is prioritize
			// it does not work same as conditional mapping,
			// so there is no match for ./dist/utils/index.mjs
			expect: ["./dist/utils/index.js"],
			suite: [
				{
					"./dist/utils/index.js": "./dist/utils/index.js",
					"./dist/utils/": "./dist/utils/index.mjs",
					"./dist/": "./lib/"
				},
				"./dist/utils/index.js",
				[]
			]
		},
		{
			name: "the longest matching path prefix is prioritized #4",
			// it does not work same as conditional mapping,
			// even if right side is a conditional mapping,
			// so there is no match for ./browser/dist/index.mjs
			expect: ["./lib/index.mjs"],
			suite: [
				{
					"./": {
						browser: "./browser/"
					},
					"./dist/": "./lib/"
				},
				"./dist/index.mjs",
				["browser"]
			]
		},
		//#endregion

		//#region Conditional mapping folder
		{
			name: "conditional mapping folder #1",
			expect: ["lodash/index.js", "./utils/index.js"],
			suite: [
				{
					"./utils/": {
						browser: ["lodash/", "./utils/"],
						node: ["./utils-node/"]
					}
				},
				"./utils/index.js",
				["browser"]
			]
		},
		{
			name: "conditional mapping folder #2",
			expect: [], // no condition names
			suite: [
				{
					"./utils/": {
						webpack: "./wpk/",
						browser: ["lodash/", "./utils/"],
						node: ["./node/"]
					}
				},
				"./utils/index.mjs",
				[]
			]
		},
		{
			name: "conditional mapping folder #3",
			expect: ["./wpk/index.mjs"],
			suite: [
				{
					"./utils/": {
						webpack: "./wpk/",
						browser: ["lodash/", "./utils/"],
						node: ["./utils/"]
					}
				},
				"./utils/index.mjs",
				["browser", "webpack"]
			]
		},
		//#endregion

		//#region Incorrect exports field definition
		{
			name: "incorrect exports field #1",
			expect: new Error(),
			suite: [
				{
					"/utils/": "./a/"
				},
				"./utils/index.mjs",
				[]
			]
		},
		{
			name: "incorrect exports field #2",
			expect: new Error(),
			suite: [
				{
					"./utils/": "/a/"
				},
				"./utils/index.mjs",
				[]
			]
		},
		{
			name: "incorrect exports field #3",
			expect: new Error(),
			suite: [
				{
					"/utils/": {
						browser: "./a/",
						default: "./b/"
					}
				},
				"./utils/index.mjs",
				["browser"]
			]
		},
		{
			name: "incorrect exports field #4",
			expect: new Error(),
			suite: [
				{
					"./utils/": {
						browser: "/a/",
						default: "/b/"
					}
				},
				"./utils/index.mjs",
				["browser"]
			]
		},
		{
			name: "incorrect exports field #5",
			expect: [],
			suite: [
				{
					"./utils/index": "./a/index.js"
				},
				"./utils/index.mjs",
				[]
			]
		},
		{
			name: "incorrect exports field #6",
			expect: [],
			suite: [
				{
					"./utils/index.mjs": "./a/index.js"
				},
				"./utils/index",
				[]
			]
		},
		{
			name: "incorrect exports field #7",
			expect: [],
			suite: [
				{
					"./utils/index": {
						browser: "./a/index.js",
						default: "./b/index.js"
					}
				},
				"./utils/index.mjs",
				["browser"]
			]
		},
		{
			name: "incorrect exports field #8",
			expect: [],
			suite: [
				{
					"./utils/index.mjs": {
						browser: "./a/index.js",
						default: "./b/index.js"
					}
				},
				"./utils/index",
				["browser"]
			]
		},
		//#endregion

		//#region Incorrect request

		{
			name: "incorrect request #1",
			expect: new Error(),
			suite: [
				{
					"./utils/": "./a/"
				},
				"/utils/index.mjs",
				[]
			]
		},
		{
			name: "incorrect request #2",
			expect: new Error(),
			suite: [
				{
					"./utils/": {
						browser: "./a/",
						default: "./b/"
					}
				},
				"/utils/index.mjs",
				["browser"]
			]
		},

		//#endregion

		//#region Directory exports targets may not backtrack above the package base
		{
			name: "backtracking package base #1",
			expect: ["./dist/index"], // we don't handle backtracking here
			suite: [
				{
					"./../../utils/": "./dist/"
				},
				"./../../utils/index",
				[]
			]
		},
		{
			name: "backtracking package base #2",
			expect: new Error(),
			suite: [
				{
					"../../utils/": "./dist/"
				},
				"../../utils/index",
				[]
			]
		},
		{
			name: "backtracking package base #3",
			expect: new Error(),
			suite: [
				{
					"./utils/": "../src/"
				},
				"./utils/index",
				[]
			]
		},
		{
			name: "backtracking package base #4",
			expect: ["./../src/index"], // we don't handle backtracking here
			suite: [
				{
					"./utils/": "./../src/"
				},
				"./utils/index",
				[]
			]
		},
		{
			name: "backtracking package base #5",
			// fits package base depth
			expect: ["./src/../index.js"],
			suite: [
				{
					"./utils/index": "./src/../index.js"
				},
				"./utils/index",
				[]
			]
		},
		{
			name: "backtracking package base #6",
			// fits package base depth,
			// but matching works as string concatenation not file paths
			expect: [],
			suite: [
				{
					"./utils/../utils/index": "./src/../index.js"
				},
				"./utils/index",
				[]
			]
		},
		{
			name: "backtracking package base #7",
			// enhanced-resolve don't know is this same package or not
			expect: new Error(),
			suite: [
				{
					"./utils/": {
						browser: "../this/"
					}
				},
				"./utils/index",
				["browser"]
			]
		},
		{
			name: "backtracking package base #8",
			expect: ["./utils/../index"],
			suite: [
				{
					"./utils/": {
						browser: "./utils/../"
					}
				},
				"./utils/index",
				["browser"]
			]
		},
		{
			name: "backtracking package base #9",
			expect: ["./dist/index"],
			suite: [
				{
					"./": "./src/../../",
					"./dist/": "./dist/"
				},
				"./dist/index",
				["browser"]
			]
		},
		//#endregion

		//#region Directory exports subpaths may not backtrack above the target folder
		{
			name: "backtracking target folder #1",
			expect: ["./dist/timezone/../../index"],
			suite: [
				{
					"./utils/": "./dist/"
				},
				"./utils/timezone/../../index",
				[]
			]
		},
		{
			name: "backtracking target folder #2",
			expect: ["./dist/timezone/../index"],
			suite: [
				{
					"./utils/": "./dist/"
				},
				"./utils/timezone/../index",
				[]
			]
		},
		{
			name: "backtracking target folder #3",
			expect: ["./dist/target/../../index"],
			suite: [
				{
					"./utils/": "./dist/target/"
				},
				"./utils/../../index",
				[]
			]
		},
		//#endregion

		//#region Exports targets cannot map into a nested node_modules path
		{
			name: "nested node_modules path #1",
			expect: ["./node_modules/lodash/dist/index.js"], // we don't handle node_modules here
			suite: [
				{
					"./utils/": {
						browser: "./node_modules/"
					}
				},
				"./utils/lodash/dist/index.js",
				["browser"]
			]
		},
		{
			name: "nested node_modules path #2",
			expect: ["./utils/../node_modules/lodash/dist/index.js"],
			suite: [
				{
					"./utils/": "./utils/../node_modules/"
				},
				"./utils/lodash/dist/index.js",
				[]
			]
		},
		//#endregion

		//#region nested mapping

		{
			name: "nested mapping #1",
			expect: [],
			suite: [
				{
					"./utils/": {
						browser: {
							webpack: "./",
							default: {
								node: "./node/"
							}
						}
					}
				},
				"./utils/index.js",
				["browser"]
			]
		},
		{
			name: "nested mapping #2",
			expect: ["./index.js", "./node/index.js"],
			suite: [
				{
					"./utils/": {
						browser: {
							webpack: ["./", "./node/"],
							default: {
								node: "./node/"
							}
						}
					}
				},
				"./utils/index.js",
				["browser", "webpack"]
			]
		},
		{
			name: "nested mapping #3",
			expect: [], // no browser condition name
			suite: [
				{
					"./utils/": {
						browser: {
							webpack: ["./", "./node/"],
							default: {
								node: "./node/"
							}
						}
					}
				},
				"./utils/index.js",
				["webpack"]
			]
		},
		{
			name: "nested mapping #4",
			expect: ["./node/index.js"],
			suite: [
				{
					"./utils/": {
						browser: {
							webpack: ["./", "./node/"],
							default: {
								node: "./node/"
							}
						}
					}
				},
				"./utils/index.js",
				["node", "browser"]
			]
		},
		{
			name: "nested mapping #5",
			expect: [],
			suite: [
				{
					"./utils/": {
						browser: {
							webpack: ["./", "./node/"],
							default: {
								node: {
									webpack: ["./wpck/"]
								}
							}
						}
					}
				},
				"./utils/index.js",
				["browser", "node"]
			]
		},
		{
			name: "nested mapping #6",
			expect: ["./index.js", "./node/index.js"],
			suite: [
				{
					"./utils/": {
						browser: {
							webpack: ["./", "./node/"],
							default: {
								node: {
									webpack: ["./wpck/"]
								}
							}
						}
					}
				},
				"./utils/index.js",
				["browser", "node", "webpack"]
			]
		},
		{
			name: "nested mapping #7",
			expect: ["./y.js"],
			suite: [
				{
					"./a.js": {
						abc: { def: "./x.js" },
						ghi: "./y.js"
					}
				},
				"./a.js",
				["abc", "ghi"]
			]
		},
		{
			name: "nested mapping #8",
			expect: [],
			suite: [
				{
					"./a.js": {
						abc: { def: "./x.js", default: [] },
						ghi: "./y.js"
					}
				},
				"./a.js",
				["abc", "ghi"]
			]
		}
		//#endregion
	];

	testCases.forEach(testCase => {
		it(testCase.name, () => {
			if (testCase.expect instanceof Error) {
				should.throws(() =>
					processExportsField(
						testCase.suite[0],
						testCase.suite[1],
						new Set(testCase.suite[2])
					)
				);
			} else {
				processExportsField(
					testCase.suite[0],
					testCase.suite[1],
					new Set(testCase.suite[2])
				).should.eql(testCase.expect);
			}
		});
	});
});
