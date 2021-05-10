const path = require("path");
const fs = require("fs");
const should = require("should");
const { processImportsField } = require("../lib/util/entrypoints");
const ResolverFactory = require("../lib/ResolverFactory");
const CachedInputFileSystem = require("../lib/CachedInputFileSystem");

/** @typedef {import("../lib/util/entrypoints").ImportsField} ImportsField */

const fixture = path.resolve(__dirname, "fixtures", "imports-field");

describe("Process imports field", function exportsField() {
	/** @type {Array<{name: string, expect: string[]|Error, suite: [ImportsField, string, string[]]}>} */
	const testCases = [
		//#region Samples
		{
			name: "sample #1",
			expect: ["./dist/test/file.js", "./src/test/file.js"],
			suite: [
				{
					"#abc/": {
						import: ["./dist/", "./src/"],
						webpack: "./wp/"
					},
					"#abc": "./main.js"
				},
				"#abc/test/file.js",
				["import", "webpack"]
			]
		},
		{
			name: "sample #2",
			expect: ["./data/timezones/pdt.mjs"],
			suite: [
				{
					"#1/timezones/": "./data/timezones/"
				},
				"#1/timezones/pdt.mjs",
				[]
			]
		},
		{
			name: "sample #3",
			// mapping works like concatenating strings not file paths
			expect: ["./data/timezones/timezones/pdt.mjs"],
			suite: [
				{
					"#aaa/": "./data/timezones/",
					"#a/": "./data/timezones/"
				},
				"#a/timezones/pdt.mjs",
				[]
			]
		},
		{
			name: "sample #4",
			expect: [],
			suite: [
				{
					"#a/lib/": {
						browser: ["./browser/"]
					},
					"#a/dist/index.js": {
						node: "./index.js"
					}
				},
				"#a/dist/index.js",
				["browser"]
			]
		},
		{
			name: "sample #5",
			expect: ["./browser/index.js"], // default condition used
			suite: [
				{
					"#a/lib/": {
						browser: ["./browser/"]
					},
					"#a/dist/index.js": {
						node: "./index.js",
						default: "./browser/index.js"
					}
				},
				"#a/dist/index.js",
				["browser"]
			]
		},
		{
			name: "sample #6",
			expect: [],
			suite: [
				{
					"#a/dist/a": "./dist/index.js"
				},
				"#a/dist/aaa",
				[]
			]
		},
		{
			name: "sample #7",
			expect: [],
			suite: [
				{
					"#a/a/a/": "./dist/index.js"
				},
				"#a/a/a",
				[]
			]
		},
		{
			name: "sample #8",
			expect: [],
			suite: [
				{
					"#a": "./index.js"
				},
				"#a/timezones/pdt.mjs",
				[]
			]
		},
		{
			name: "sample #9",
			expect: ["./main.js"],
			suite: [
				{
					"#a/index.js": "./main.js"
				},
				"#a/index.js",
				[]
			]
		},
		{
			name: "sample #10",
			expect: ["./ok.js"],
			suite: [
				{
					"#a/#foo": "./ok.js",
					"#a/module": "./ok.js",
					"#a/🎉": "./ok.js",
					"#a/%F0%9F%8E%89": "./other.js",
					"#a/bar#foo": "./ok.js",
					"#a/#zapp/": "./"
				},
				"#a/#foo",
				[]
			]
		},
		{
			name: "sample #11",
			expect: ["./ok.js"],
			suite: [
				{
					"#a/#foo": "./ok.js",
					"#a/module": "./ok.js",
					"#a/🎉": "./ok.js",
					"#a/%F0%9F%8E%89": "./other.js",
					"#a/bar#foo": "./ok.js",
					"#a/#zapp/": "./"
				},
				"#a/bar#foo",
				[]
			]
		},
		{
			name: "sample #12",
			expect: ["./ok.js#abc"],
			suite: [
				{
					"#a/#foo": "./ok.js",
					"#a/module": "./ok.js",
					"#a/🎉": "./ok.js",
					"#a/%F0%9F%8E%89": "./other.js",
					"#a/bar#foo": "./ok.js",
					"#a/#zapp/": "./"
				},
				"#a/#zapp/ok.js#abc",
				[]
			]
		},
		{
			name: "sample #13",
			expect: ["./ok.js?abc"],
			suite: [
				{
					"#a/#foo": "./ok.js",
					"#a/module": "./ok.js",
					"#a/🎉": "./ok.js",
					"#a/%F0%9F%8E%89": "./other.js",
					"#a/bar#foo": "./ok.js",
					"#a/#zapp/": "./"
				},
				"#a/#zapp/ok.js?abc",
				[]
			]
		},
		{
			name: "sample #14",
			expect: ["./🎉.js"],
			suite: [
				{
					"#a/#foo": "./ok.js",
					"#a/module": "./ok.js",
					"#a/🎉": "./ok.js",
					"#a/%F0%9F%8E%89": "./other.js",
					"#a/bar#foo": "./ok.js",
					"#a/#zapp/": "./"
				},
				"#a/#zapp/🎉.js",
				[]
			]
		},
		{
			name: "sample #15",
			expect: ["./%F0%9F%8E%89.js"],
			suite: [
				{
					"#a/#foo": "./ok.js",
					"#a/module": "./ok.js",
					"#a/🎉": "./ok.js",
					"#a/%F0%9F%8E%89": "./other.js",
					"#a/bar#foo": "./ok.js",
					"#a/#zapp/": "./"
				},
				// "🎉" percent encoded
				"#a/#zapp/%F0%9F%8E%89.js",
				[]
			]
		},
		{
			name: "sample #16",
			expect: ["./ok.js"],
			suite: [
				{
					"#a/#foo": "./ok.js",
					"#a/module": "./ok.js",
					"#a/🎉": "./ok.js",
					"#a/%F0%9F%8E%89": "./other.js",
					"#a/bar#foo": "./ok.js",
					"#a/#zapp/": "./"
				},
				"#a/🎉",
				[]
			]
		},
		{
			name: "sample #17",
			expect: ["./other.js"],
			suite: [
				{
					"#a/#foo": "./ok.js",
					"#a/module": "./ok.js",
					"#a/🎉": "./ok.js",
					"#a/%F0%9F%8E%89": "./other.js",
					"#a/bar#foo": "./ok.js",
					"#a/#zapp/": "./"
				},
				"#a/%F0%9F%8E%89",
				[]
			]
		},
		{
			name: "sample #18",
			expect: ["./ok.js"],
			suite: [
				{
					"#a/#foo": "./ok.js",
					"#a/module": "./ok.js",
					"#a/🎉": "./ok.js",
					"#a/%F0%9F%8E%89": "./other.js",
					"#a/bar#foo": "./ok.js",
					"#a/#zapp/": "./"
				},
				"#a/module",
				[]
			]
		},
		{
			name: "sample #19",
			expect: [],
			suite: [
				{
					"#a/#foo": "./ok.js",
					"#a/module": "./ok.js",
					"#a/🎉": "./ok.js",
					"#a/%F0%9F%8E%89": "./other.js",
					"#a/bar#foo": "./ok.js",
					"#a/#zapp/": "./"
				},
				"#a/module#foo",
				[]
			]
		},
		{
			name: "sample #20",
			expect: [],
			suite: [
				{
					"#a/#foo": "./ok.js",
					"#a/module": "./ok.js",
					"#a/🎉": "./ok.js",
					"#a/%F0%9F%8E%89": "./other.js",
					"#a/bar#foo": "./ok.js",
					"#a/#zapp/": "./"
				},
				"#a/module?foo",
				[]
			]
		},
		{
			name: "sample #21",
			expect: ["./d?e?f"],
			suite: [
				{
					"#a/a?b?c/": "./"
				},
				"#a/a?b?c/d?e?f",
				[]
			]
		},
		{
			name: "sample #22",
			expect: ["/user/a/index"],
			suite: [
				{
					"#a/": "/user/a/"
				},
				"#a/index",
				[]
			]
		},
		{
			name: "path tree edge case #1",
			expect: ["./A/b/d.js"],
			suite: [
				{
					"#a/": "./A/",
					"#a/b/c": "./c.js"
				},
				"#a/b/d.js",
				[]
			]
		},
		{
			name: "path tree edge case #2",
			expect: ["./A/c.js"],
			suite: [
				{
					"#a/": "./A/",
					"#a/b": "./b.js"
				},
				"#a/c.js",
				[]
			]
		},
		{
			name: "path tree edge case #3",
			expect: ["./A/b/c/d.js"],
			suite: [
				{
					"#a/": "./A/",
					"#a/b/c/d": "./c.js"
				},
				"#a/b/c/d.js",
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
					"#a": "./dist/index.js"
				},
				"#a",
				[]
			]
		},
		{
			name: "Direct mapping #2",
			expect: [],
			suite: [
				{
					"#a/": "./"
				},
				"#a",
				[]
			]
		},
		{
			name: "Direct mapping #3",
			expect: ["./dist/a.js"], // direct mapping is more prioritize
			suite: [
				{
					"#a/": "./dist/",
					"#a/index.js": "./dist/a.js"
				},
				"#a/index.js",
				[]
			]
		},
		{
			name: "Direct mapping #4",
			expect: ["./index.js"], // direct mapping is more prioritize
			suite: [
				{
					"#a/": {
						browser: ["./browser/"]
					},
					"#a/index.js": {
						browser: "./index.js"
					}
				},
				"#a/index.js",
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
					"#a/": {
						browser: ["./browser/"]
					},
					"#a/index.js": {
						node: "./node.js"
					}
				},
				"#a/index.js",
				["browser"]
			]
		},
		{
			name: "Direct mapping #6",
			expect: ["./index.js"],
			suite: [
				{
					"#a": {
						browser: "./index.js",
						node: "./src/node/index.js",
						default: "./src/index.js"
					}
				},
				"#a",
				["browser"]
			]
		},
		{
			name: "Direct mapping #7",
			expect: new Error(), // Default is first one
			suite: [
				{
					"#a": {
						default: "./src/index.js",
						browser: "./index.js",
						node: "./src/node/index.js"
					}
				},
				"#a",
				["browser"]
			]
		},
		{
			name: "Direct mapping #8",
			expect: ["./src/index.js"],
			suite: [
				{
					"#a": {
						browser: "./index.js",
						node: "./src/node/index.js",
						default: "./src/index.js"
					}
				},
				"#a",
				[]
			]
		},
		{
			name: "Direct mapping #9",
			expect: ["./index"], // it is fine, file may not have extension
			suite: [
				{
					"#a": "./index"
				},
				"#a",
				[]
			]
		},
		{
			name: "Direct mapping #10",
			expect: ["./index.js"],
			suite: [
				{
					"#a/index": "./index.js"
				},
				"#a/index",
				[]
			]
		},
		{
			name: "Direct mapping #11",
			expect: ["b"],
			suite: [
				{
					"#a": "b"
				},
				"#a",
				[]
			]
		},
		{
			name: "Direct mapping #12",
			expect: ["b/index"],
			suite: [
				{
					"#a/": "b/"
				},
				"#a/index",
				[]
			]
		},
		{
			name: "Direct mapping #13",
			expect: ["b#anotherhashishere"],
			suite: [
				{
					"#a?q=a#hashishere": "b#anotherhashishere"
				},
				"#a?q=a#hashishere",
				[]
			]
		},
		//#endregion

		//#region Direct and conditional mapping
		{
			name: "Direct and conditional mapping #1",
			expect: [],
			suite: [
				{
					"#a": [
						{ browser: "./browser.js" },
						{ require: "./require.js" },
						{ import: "./import.mjs" }
					]
				},
				"#a",
				[]
			]
		},
		{
			name: "Direct and conditional mapping #2",
			expect: ["./import.mjs"],
			suite: [
				{
					"#a": [
						{ browser: "./browser.js" },
						{ require: "./require.js" },
						{ import: "./import.mjs" }
					]
				},
				"#a",
				["import"]
			]
		},
		{
			name: "Direct and conditional mapping #3",
			expect: ["./require.js", "./import.mjs"],
			suite: [
				{
					"#a": [
						{ browser: "./browser.js" },
						{ require: "./require.js" },
						{ import: "./import.mjs" }
					]
				},
				"#a",
				["import", "require"]
			]
		},
		{
			name: "Direct and conditional mapping #4",
			expect: ["./require.js", "./import.mjs", "#b/import.js"],
			suite: [
				{
					"#a": [
						{ browser: "./browser.js" },
						{ require: ["./require.js"] },
						{ import: ["./import.mjs", "#b/import.js"] }
					]
				},
				"#a",
				["import", "require"]
			]
		},
		//#endregion

		//#region When mapping to a folder root, both the left and right sides must end in slashes
		{
			name: "mapping to a folder root #1",
			expect: [],
			suite: [
				{
					"#timezones": "./data/timezones/"
				},
				"#timezones/pdt.mjs",
				[]
			]
		},
		{
			name: "mapping to a folder root #2",
			expect: new Error(), // incorrect export field
			suite: [
				{
					"#timezones/": "./data/timezones"
				},
				"#timezones/pdt.mjs",
				[]
			]
		},
		{
			name: "mapping to a folder root #3",
			expect: ["./data/timezones/pdt/index.mjs"],
			suite: [
				{
					"#timezones/pdt/": "./data/timezones/pdt/"
				},
				"#timezones/pdt/index.mjs",
				[]
			]
		},
		{
			name: "mapping to a folder root #4",
			expect: ["./timezones/pdt.mjs"],
			suite: [
				{
					"#a/": "./timezones/"
				},
				"#a/pdt.mjs",
				[]
			]
		},
		{
			name: "mapping to a folder root #5",
			expect: ["./timezones/pdt.mjs"],
			suite: [
				{
					"#a/": "./"
				},
				"#a/timezones/pdt.mjs",
				[]
			]
		},
		{
			name: "mapping to a folder root #6",
			expect: new Error(), // not a folder mapping
			suite: [
				{
					"#a/": "."
				},
				"#a/timezones/pdt.mjs",
				[]
			]
		},
		{
			name: "mapping to a folder root #7",
			expect: [], // incorrect export field, but value did not processed
			suite: [
				{
					"#a": "./"
				},
				"#a/timezones/pdt.mjs",
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
					"#a/": "./",
					"#a/dist/": "./lib/"
				},
				"#a/dist/index.mjs",
				[]
			]
		},
		{
			name: "the longest matching path prefix is prioritized #2",
			expect: ["./dist/utils/index.js"],
			suite: [
				{
					"#a/dist/utils/": "./dist/utils/",
					"#a/dist/": "./lib/"
				},
				"#a/dist/utils/index.js",
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
					"#a/dist/utils/index.js": "./dist/utils/index.js",
					"#a/dist/utils/": "./dist/utils/index.mjs",
					"#a/dist/": "./lib/"
				},
				"#a/dist/utils/index.js",
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
					"#a/": {
						browser: "./browser/"
					},
					"#a/dist/": "./lib/"
				},
				"#a/dist/index.mjs",
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
					"#a/": {
						browser: ["lodash/", "./utils/"],
						node: ["./utils-node/"]
					}
				},
				"#a/index.js",
				["browser"]
			]
		},
		{
			name: "conditional mapping folder #2",
			expect: [], // no condition names
			suite: [
				{
					"#a/": {
						webpack: "./wpk/",
						browser: ["lodash/", "./utils/"],
						node: ["./node/"]
					}
				},
				"#a/index.mjs",
				[]
			]
		},
		{
			name: "conditional mapping folder #3",
			expect: ["./wpk/index.mjs"],
			suite: [
				{
					"#a/": {
						webpack: "./wpk/",
						browser: ["lodash/", "./utils/"],
						node: ["./utils/"]
					}
				},
				"#a/index.mjs",
				["browser", "webpack"]
			]
		},
		//#endregion

		//#region Incorrect imports field definition
		{
			name: "incorrect exports field #1",
			expect: new Error(),
			suite: [
				{
					"/utils/": "./a/"
				},
				"#a/index.mjs",
				[]
			]
		},
		{
			name: "incorrect exports field #2",
			expect: new Error(),
			suite: [
				{
					"/utils/": {
						browser: "./a/",
						default: "./b/"
					}
				},
				"#a/index.mjs",
				["browser"]
			]
		},
		{
			name: "incorrect exports field #3",
			expect: [],
			suite: [
				{
					"#a/index": "./a/index.js"
				},
				"#a/index.mjs",
				[]
			]
		},
		{
			name: "incorrect exports field #4",
			expect: [],
			suite: [
				{
					"#a/index.mjs": "./a/index.js"
				},
				"#a/index",
				[]
			]
		},
		{
			name: "incorrect exports field #5",
			expect: [],
			suite: [
				{
					"#a/index": {
						browser: "./a/index.js",
						default: "./b/index.js"
					}
				},
				"#a/index.mjs",
				["browser"]
			]
		},
		{
			name: "incorrect exports field #6",
			expect: [],
			suite: [
				{
					"#a/index.mjs": {
						browser: "./a/index.js",
						default: "./b/index.js"
					}
				},
				"#a/index",
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
					"#a/": "./a/"
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
					"#a/": {
						browser: "./a/",
						default: "./b/"
					}
				},
				"./utils/index.mjs",
				["browser"]
			]
		},
		{
			name: "incorrect request #3",
			expect: new Error(),
			suite: [
				{
					"#a/": {
						browser: "./a/",
						default: "./b/"
					}
				},
				"#",
				["browser"]
			]
		},
		{
			name: "incorrect request #4",
			expect: new Error(),
			suite: [
				{
					"#a/": {
						browser: "./a/",
						default: "./b/"
					}
				},
				"#/",
				["browser"]
			]
		},
		{
			name: "incorrect request #5",
			expect: new Error(),
			suite: [
				{
					"#a/": {
						browser: "./a/",
						default: "./b/"
					}
				},
				"#a/",
				["browser"]
			]
		},
		//#endregion

		//#region Directory imports targets may backtrack above the package base
		{
			name: "backtracking package base #1",
			expect: ["./dist/index"], // we don't handle backtracking here
			suite: [
				{
					"#a/../../utils/": "./dist/"
				},
				"#a/../../utils/index",
				[]
			]
		},
		{
			name: "backtracking package base #2",
			expect: ["./dist/../../utils/index"],
			suite: [
				{
					"#a/": "./dist/"
				},
				"#a/../../utils/index",
				[]
			]
		},
		{
			name: "backtracking package base #3",
			expect: ["../src/index"],
			suite: [
				{
					"#a/": "../src/"
				},
				"#a/index",
				[]
			]
		},
		{
			name: "backtracking package base #4",
			expect: ["./utils/../../../index"],
			suite: [
				{
					"#a/": {
						browser: "./utils/../../../"
					}
				},
				"#a/index",
				["browser"]
			]
		},
		//#endregion

		//#region Imports targets cannot map into a nested node_modules path
		{
			name: "nested node_modules path #1",
			expect: ["moment/node_modules/lodash/dist/index.js"], // we don't handle node_modules here
			suite: [
				{
					"#a/": {
						browser: "moment/node_modules/"
					}
				},
				"#a/lodash/dist/index.js",
				["browser"]
			]
		},
		{
			name: "nested node_modules path #2",
			expect: ["../node_modules/lodash/dist/index.js"],
			suite: [
				{
					"#a/": "../node_modules/"
				},
				"#a/lodash/dist/index.js",
				[]
			]
		},
		//#endregion

		//#region Nested mapping
		{
			name: "nested mapping #1",
			expect: [],
			suite: [
				{
					"#a/": {
						browser: {
							webpack: "./",
							default: {
								node: "./node/"
							}
						}
					}
				},
				"#a/index.js",
				["browser"]
			]
		},
		{
			name: "nested mapping #2",
			expect: ["./index.js", "./node/index.js"],
			suite: [
				{
					"#a/": {
						browser: {
							webpack: ["./", "./node/"],
							default: {
								node: "./node/"
							}
						}
					}
				},
				"#a/index.js",
				["browser", "webpack"]
			]
		},
		{
			name: "nested mapping #3",
			expect: [], // no browser condition name
			suite: [
				{
					"#a/": {
						browser: {
							webpack: ["./", "./node/"],
							default: {
								node: "./node/"
							}
						}
					}
				},
				"#a/index.js",
				["webpack"]
			]
		},
		{
			name: "nested mapping #4",
			expect: ["moment/node/index.js"],
			suite: [
				{
					"#a/": {
						browser: {
							webpack: ["./", "./node/"],
							default: {
								node: "moment/node/"
							}
						}
					}
				},
				"#a/index.js",
				["node", "browser"]
			]
		},
		{
			name: "nested mapping #5",
			expect: [],
			suite: [
				{
					"#a/": {
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
				"#a/index.js",
				["browser", "node"]
			]
		},
		{
			name: "nested mapping #6",
			expect: ["./index.js", "./node/index.js"],
			suite: [
				{
					"#a/": {
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
				"#a/index.js",
				["browser", "node", "webpack"]
			]
		},
		{
			name: "nested mapping #7",
			expect: ["./y.js"],
			suite: [
				{
					"#a": {
						abc: { def: "./x.js" },
						ghi: "./y.js"
					}
				},
				"#a",
				["abc", "ghi"]
			]
		},
		{
			name: "nested mapping #8",
			expect: [],
			suite: [
				{
					"#a": {
						abc: { def: "./x.js", default: [] },
						ghi: "./y.js"
					}
				},
				"#a",
				["abc", "ghi"]
			]
		}
		//#endregion
	];

	testCases.forEach(testCase => {
		it(testCase.name, () => {
			if (testCase.expect instanceof Error) {
				should.throws(() =>
					processImportsField(testCase.suite[0])(
						testCase.suite[1],
						new Set(testCase.suite[2])
					)
				);
			} else {
				processImportsField(testCase.suite[0])(
					testCase.suite[1],
					new Set(testCase.suite[2])
				).should.eql(testCase.expect);
			}
		});
	});
});

describe("ImportsFieldPlugin", () => {
	const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

	const resolver = ResolverFactory.createResolver({
		extensions: [".js"],
		fileSystem: nodeFileSystem,
		mainFiles: ["index.js"],
		conditionNames: ["webpack"]
	});

	it("should resolve using imports field instead of self-referencing", done => {
		resolver.resolve({}, fixture, "#imports-field", {}, (err, result) => {
			if (err) return done(err);
			if (!result) throw new Error("No result");
			result.should.equal(path.resolve(fixture, "b.js"));
			done();
		});
	});

	it("should resolve using imports field instead of self-referencing for a subpath", done => {
		resolver.resolve(
			{},
			path.resolve(fixture, "dir"),
			"#imports-field",
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) throw new Error("No result");
				result.should.equal(path.resolve(fixture, "b.js"));
				done();
			}
		);
	});

	it("should resolve out of package scope", done => {
		resolver.resolve({}, fixture, "#b", {}, (err, result) => {
			if (err) return done(err);
			if (!result) throw new Error("No result");
			result.should.equal(path.resolve(fixture, "../b.js"));
			done();
		});
	});

	it("field name #1", done => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			fileSystem: nodeFileSystem,
			mainFiles: ["index.js"],
			importsFields: [["imports"]],
			conditionNames: ["webpack"]
		});

		resolver.resolve({}, fixture, "#b", {}, (err, result) => {
			if (err) return done(err);
			if (!result) throw new Error("No result");
			result.should.equal(path.resolve(fixture, "../b.js"));
			done();
		});
	});

	it("field name #2", done => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			fileSystem: nodeFileSystem,
			mainFiles: ["index.js"],
			importsFields: [["other", "imports"], "imports"],
			conditionNames: ["webpack"]
		});

		resolver.resolve({}, fixture, "#b", {}, (err, result) => {
			if (err) return done(err);
			if (!result) throw new Error("No result");
			result.should.equal(path.resolve(fixture, "./a.js"));
			done();
		});
	});

	it("should resolve package #1", done => {
		resolver.resolve({}, fixture, "#a/dist/main.js", {}, (err, result) => {
			if (err) return done(err);
			if (!result) throw new Error("No result");
			result.should.equal(
				path.resolve(fixture, "node_modules/a/lib/lib2/main.js")
			);
			done();
		});
	});

	it("should resolve package #2", done => {
		resolver.resolve({}, fixture, "#a", {}, (err, result) => {
			if (!err) throw new Error(`expect error, got ${result}`);
			err.should.be.instanceof(Error);
			err.message.should.match(/is not imported from package/);
			done();
		});
	});

	it("should resolve package #3", done => {
		resolver.resolve({}, fixture, "#ccc/index.js", {}, (err, result) => {
			if (err) return done(err);
			if (!result) throw new Error("No result");
			result.should.equal(path.resolve(fixture, "node_modules/c/index.js"));
			done();
		});
	});

	it("should resolve package #4", done => {
		resolver.resolve({}, fixture, "#c", {}, (err, result) => {
			if (err) return done(err);
			if (!result) throw new Error("No result");
			result.should.equal(path.resolve(fixture, "node_modules/c/index.js"));
			done();
		});
	});

	it("should resolve absolute path as an imports field target", done => {
		const tmpdirPrefix = path.join(fixture, "node_modules/absolute-tmp-");
		fs.mkdtemp(tmpdirPrefix, (err, dir) => {
			if (err) done(err);

			const pjson = path.resolve(dir, "./package.json");
			const file = path.resolve(dir, "./index");
			fs.writeFileSync(file, "");
			fs.writeFileSync(pjson, JSON.stringify({ imports: { "#a": file } }));

			resolver.resolve({}, dir, "#a", {}, (err, result) => {
				fs.unlinkSync(file);
				fs.unlinkSync(pjson);
				fs.rmdirSync(dir);
				if (err) return done(err);
				if (!result) throw new Error("No result");
				console.log(result);
				result.should.equal(file);
				done();
			});
		});
	});

	it("should log the correct info", done => {
		const log = [];
		resolver.resolve(
			{},
			fixture,
			"#a/dist/index.js",
			{ log: v => log.push(v) },
			(err, result) => {
				if (err) return done(err);
				if (!result) throw new Error("No result");
				result.should.be.eql(path.join(fixture, "node_modules/a/lib/index.js"));
				log
					.map(line => line.replace(fixture, "...").replace(/\\/g, "/"))
					.should.be.eql([
						"resolve '#a/dist/index.js' in '...'",
						"  using description file: .../package.json (relative path: .)",
						"    resolve as internal import",
						"      using imports field: a/dist/index.js",
						"        Parsed request is a module",
						"        using description file: .../package.json (relative path: .)",
						"          resolve as module",
						"            looking for modules in .../node_modules",
						"              existing directory .../node_modules/a",
						"                using description file: .../node_modules/a/package.json (relative path: .)",
						"                  using exports field: ./lib/lib2/index.js",
						"                    using description file: .../node_modules/a/package.json (relative path: ./lib/lib2/index.js)",
						"                      no extension",
						"                        .../node_modules/a/lib/lib2/index.js doesn't exist",
						"                      .js",
						"                        .../node_modules/a/lib/lib2/index.js.js doesn't exist",
						"                      as directory",
						"                        .../node_modules/a/lib/lib2/index.js doesn't exist",
						"                  using exports field: ./lib/index.js",
						"                    using description file: .../node_modules/a/package.json (relative path: ./lib/index.js)",
						"                      no extension",
						"                        existing file: .../node_modules/a/lib/index.js",
						"                          reporting result .../node_modules/a/lib/index.js"
					]);
				done();
			}
		);
	});
});
