"use strict";

const fs = require("fs");
const path = require("path");
const CachedInputFileSystem = require("../lib/CachedInputFileSystem");
const ResolverFactory = require("../lib/ResolverFactory");
const { processImportsField } = require("../lib/util/entrypoints");

/** @typedef {import("../lib/util/entrypoints").ImportsField} ImportsField */

const fixture = path.resolve(__dirname, "fixtures", "imports-field");
const fixture1 = path.resolve(__dirname, "fixtures", "imports-field-different");

describe("process imports field", () => {
	/** @type {Array<{name: string, expect: string[]|Error, suite: [ImportsField, string, string[]]}>} */
	const testCases = [
		// #region Samples
		{
			name: "sample #1",
			expect: ["./dist/test/file.js", "./src/test/file.js"],
			suite: [
				{
					"#abc/": {
						import: ["./dist/", "./src/"],
						webpack: "./wp/",
					},
					"#abc": "./main.js",
				},
				"#abc/test/file.js",
				["import", "webpack"],
			],
		},
		{
			name: "sample #2",
			expect: ["./data/timezones/pdt.mjs"],
			suite: [
				{
					"#1/timezones/": "./data/timezones/",
				},
				"#1/timezones/pdt.mjs",
				[],
			],
		},
		{
			name: "sample #3",
			// mapping works like concatenating strings not file paths
			expect: ["./data/timezones/timezones/pdt.mjs"],
			suite: [
				{
					"#aaa/": "./data/timezones/",
					"#a/": "./data/timezones/",
				},
				"#a/timezones/pdt.mjs",
				[],
			],
		},
		{
			name: "sample #4",
			expect: [],
			suite: [
				{
					"#a/lib/": {
						browser: ["./browser/"],
					},
					"#a/dist/index.js": {
						node: "./index.js",
					},
				},
				"#a/dist/index.js",
				["browser"],
			],
		},
		{
			name: "sample #5",
			expect: ["./browser/index.js"], // default condition used
			suite: [
				{
					"#a/lib/": {
						browser: ["./browser/"],
					},
					"#a/dist/index.js": {
						node: "./index.js",
						default: "./browser/index.js",
					},
				},
				"#a/dist/index.js",
				["browser"],
			],
		},
		{
			name: "sample #6",
			expect: [],
			suite: [
				{
					"#a/dist/a": "./dist/index.js",
				},
				"#a/dist/aaa",
				[],
			],
		},
		{
			name: "sample #7",
			expect: [],
			suite: [
				{
					"#a/a/a/": "./dist/index.js",
				},
				"#a/a/a",
				[],
			],
		},
		{
			name: "sample #8",
			expect: [],
			suite: [
				{
					"#a": "./index.js",
				},
				"#a/timezones/pdt.mjs",
				[],
			],
		},
		{
			name: "sample #9",
			expect: ["./main.js"],
			suite: [
				{
					"#a/index.js": "./main.js",
				},
				"#a/index.js",
				[],
			],
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
					"#a/#zapp/": "./",
				},
				"#a/#foo",
				[],
			],
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
					"#a/#zapp/": "./",
				},
				"#a/bar#foo",
				[],
			],
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
					"#a/#zapp/": "./",
				},
				"#a/#zapp/ok.js#abc",
				[],
			],
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
					"#a/#zapp/": "./",
				},
				"#a/#zapp/ok.js?abc",
				[],
			],
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
					"#a/#zapp/": "./",
				},
				"#a/#zapp/🎉.js",
				[],
			],
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
					"#a/#zapp/": "./",
				},
				// "🎉" percent encoded
				"#a/#zapp/%F0%9F%8E%89.js",
				[],
			],
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
					"#a/#zapp/": "./",
				},
				"#a/🎉",
				[],
			],
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
					"#a/#zapp/": "./",
				},
				"#a/%F0%9F%8E%89",
				[],
			],
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
					"#a/#zapp/": "./",
				},
				"#a/module",
				[],
			],
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
					"#a/#zapp/": "./",
				},
				"#a/module#foo",
				[],
			],
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
					"#a/#zapp/": "./",
				},
				"#a/module?foo",
				[],
			],
		},
		{
			name: "sample #21",
			expect: ["./d?e?f"],
			suite: [
				{
					"#a/a?b?c/": "./",
				},
				"#a/a?b?c/d?e?f",
				[],
			],
		},
		{
			name: "sample #22",
			expect: ["/user/a/index"],
			suite: [
				{
					"#a/": "/user/a/",
				},
				"#a/index",
				[],
			],
		},
		{
			name: "path tree edge case #1",
			expect: ["./A/b/d.js"],
			suite: [
				{
					"#a/": "./A/",
					"#a/b/c": "./c.js",
				},
				"#a/b/d.js",
				[],
			],
		},
		{
			name: "path tree edge case #2",
			expect: ["./A/c.js"],
			suite: [
				{
					"#a/": "./A/",
					"#a/b": "./b.js",
				},
				"#a/c.js",
				[],
			],
		},
		{
			name: "path tree edge case #3",
			expect: ["./A/b/c/d.js"],
			suite: [
				{
					"#a/": "./A/",
					"#a/b/c/d": "./c.js",
				},
				"#a/b/c/d.js",
				[],
			],
		},
		// #endregion

		// #region Direct mapping
		{
			name: "Direct mapping #1",
			expect: ["./dist/index.js"],
			suite: [
				{
					"#a": "./dist/index.js",
				},
				"#a",
				[],
			],
		},
		{
			name: "Direct mapping #2",
			expect: [],
			suite: [
				{
					"#a/": "./",
				},
				"#a",
				[],
			],
		},
		{
			name: "Direct mapping #3",
			expect: ["./dist/a.js"], // direct mapping is more prioritize
			suite: [
				{
					"#a/": "./dist/",
					"#a/index.js": "./dist/a.js",
				},
				"#a/index.js",
				[],
			],
		},
		{
			name: "Direct mapping #4",
			expect: ["./index.js"], // direct mapping is more prioritize
			suite: [
				{
					"#a/": {
						browser: ["./browser/"],
					},
					"#a/index.js": {
						browser: "./index.js",
					},
				},
				"#a/index.js",
				["browser"],
			],
		},
		{
			name: "Direct mapping #5",
			// direct mapping is more prioritize,
			// so there is no match
			expect: [],
			suite: [
				{
					"#a/": {
						browser: ["./browser/"],
					},
					"#a/index.js": {
						node: "./node.js",
					},
				},
				"#a/index.js",
				["browser"],
			],
		},
		{
			name: "Direct mapping #6",
			expect: ["./index.js"],
			suite: [
				{
					"#a": {
						browser: "./index.js",
						node: "./src/node/index.js",
						default: "./src/index.js",
					},
				},
				"#a",
				["browser"],
			],
		},
		{
			name: "Direct mapping #7",
			expect: ["./src/index.js"], // Default is first one
			suite: [
				{
					"#a": {
						default: "./src/index.js",
						browser: "./index.js",
						node: "./src/node/index.js",
					},
				},
				"#a",
				["browser"],
			],
		},
		{
			name: "Direct mapping #8",
			expect: ["./src/index.js"],
			suite: [
				{
					"#a": {
						browser: "./index.js",
						node: "./src/node/index.js",
						default: "./src/index.js",
					},
				},
				"#a",
				[],
			],
		},
		{
			name: "Direct mapping #9",
			expect: ["./index"], // it is fine, file may not have extension
			suite: [
				{
					"#a": "./index",
				},
				"#a",
				[],
			],
		},
		{
			name: "Direct mapping #10",
			expect: ["./index.js"],
			suite: [
				{
					"#a/index": "./index.js",
				},
				"#a/index",
				[],
			],
		},
		{
			name: "Direct mapping #11",
			expect: ["b"],
			suite: [
				{
					"#a": "b",
				},
				"#a",
				[],
			],
		},
		{
			name: "Direct mapping #12",
			expect: ["b/index"],
			suite: [
				{
					"#a/": "b/",
				},
				"#a/index",
				[],
			],
		},
		{
			name: "Direct mapping #13",
			expect: ["b#anotherhashishere"],
			suite: [
				{
					"#a?q=a#hashishere": "b#anotherhashishere",
				},
				"#a?q=a#hashishere",
				[],
			],
		},
		// #endregion

		// #region Direct and conditional mapping
		{
			name: "Direct and conditional mapping #1",
			expect: [],
			suite: [
				{
					"#a": [
						{ browser: "./browser.js" },
						{ require: "./require.js" },
						{ import: "./import.mjs" },
					],
				},
				"#a",
				[],
			],
		},
		{
			name: "Direct and conditional mapping #2",
			expect: ["./import.mjs"],
			suite: [
				{
					"#a": [
						{ browser: "./browser.js" },
						{ require: "./require.js" },
						{ import: "./import.mjs" },
					],
				},
				"#a",
				["import"],
			],
		},
		{
			name: "Direct and conditional mapping #3",
			expect: ["./require.js", "./import.mjs"],
			suite: [
				{
					"#a": [
						{ browser: "./browser.js" },
						{ require: "./require.js" },
						{ import: "./import.mjs" },
					],
				},
				"#a",
				["import", "require"],
			],
		},
		{
			name: "Direct and conditional mapping #4",
			expect: ["./require.js", "./import.mjs", "#b/import.js"],
			suite: [
				{
					"#a": [
						{ browser: "./browser.js" },
						{ require: ["./require.js"] },
						{ import: ["./import.mjs", "#b/import.js"] },
					],
				},
				"#a",
				["import", "require"],
			],
		},
		// #endregion

		// #region When mapping to a folder root, both the left and right sides must end in slashes
		{
			name: "mapping to a folder root #1",
			expect: [],
			suite: [
				{
					"#timezones": "./data/timezones/",
				},
				"#timezones/pdt.mjs",
				[],
			],
		},
		{
			name: "mapping to a folder root #2",
			expect: new Error(
				'Expecting folder to folder mapping. "./data/timezones" should end with "/"',
			),
			suite: [
				{
					"#timezones/": "./data/timezones",
				},
				"#timezones/pdt.mjs",
				[],
			],
		},
		{
			name: "mapping to a folder root #3",
			expect: ["./data/timezones/pdt/index.mjs"],
			suite: [
				{
					"#timezones/pdt/": "./data/timezones/pdt/",
				},
				"#timezones/pdt/index.mjs",
				[],
			],
		},
		{
			name: "mapping to a folder root #4",
			expect: ["./timezones/pdt.mjs"],
			suite: [
				{
					"#a/": "./timezones/",
				},
				"#a/pdt.mjs",
				[],
			],
		},
		{
			name: "mapping to a folder root #5",
			expect: ["./timezones/pdt.mjs"],
			suite: [
				{
					"#a/": "./",
				},
				"#a/timezones/pdt.mjs",
				[],
			],
		},
		{
			name: "mapping to a folder root #6",
			expect: new Error(
				'Expecting folder to folder mapping. "." should end with "/"',
			),
			suite: [
				{
					"#a/": ".",
				},
				"#a/timezones/pdt.mjs",
				[],
			],
		},
		{
			name: "mapping to a folder root #7",
			expect: [], // incorrect export field, but value did not processed
			suite: [
				{
					"#a": "./",
				},
				"#a/timezones/pdt.mjs",
				[],
			],
		},
		// #endregion

		// #region The longest matching path prefix is prioritized
		{
			name: "the longest matching path prefix is prioritized #1",
			// it does not work same as conditional mapping,
			// so there is no match for ./dist/index.mjs
			expect: ["./lib/index.mjs"],
			suite: [
				{
					"#a/": "./",
					"#a/dist/": "./lib/",
				},
				"#a/dist/index.mjs",
				[],
			],
		},
		{
			name: "the longest matching path prefix is prioritized #2",
			expect: ["./dist/utils/index.js"],
			suite: [
				{
					"#a/dist/utils/": "./dist/utils/",
					"#a/dist/": "./lib/",
				},
				"#a/dist/utils/index.js",
				[],
			],
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
					"#a/dist/": "./lib/",
				},
				"#a/dist/utils/index.js",
				[],
			],
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
						browser: "./browser/",
					},
					"#a/dist/": "./lib/",
				},
				"#a/dist/index.mjs",
				["browser"],
			],
		},
		// #endregion

		// #region Conditional mapping folder
		{
			name: "conditional mapping folder #1",
			expect: ["lodash/index.js", "./utils/index.js"],
			suite: [
				{
					"#a/": {
						browser: ["lodash/", "./utils/"],
						node: ["./utils-node/"],
					},
				},
				"#a/index.js",
				["browser"],
			],
		},
		{
			name: "conditional mapping folder #2",
			expect: [], // no condition names
			suite: [
				{
					"#a/": {
						webpack: "./wpk/",
						browser: ["lodash/", "./utils/"],
						node: ["./node/"],
					},
				},
				"#a/index.mjs",
				[],
			],
		},
		{
			name: "conditional mapping folder #3",
			expect: ["./wpk/index.mjs"],
			suite: [
				{
					"#a/": {
						webpack: "./wpk/",
						browser: ["lodash/", "./utils/"],
						node: ["./utils/"],
					},
				},
				"#a/index.mjs",
				["browser", "webpack"],
			],
		},
		// #endregion

		// #region Incorrect imports field definition
		{
			name: "incorrect exports field #1",
			expect: [],
			suite: [
				{
					"#a/index": "./a/index.js",
				},
				"#a/index.mjs",
				[],
			],
		},
		{
			name: "incorrect exports field #2",
			expect: [],
			suite: [
				{
					"#a/index.mjs": "./a/index.js",
				},
				"#a/index",
				[],
			],
		},
		{
			name: "incorrect exports field #3",
			expect: [],
			suite: [
				{
					"#a/index": {
						browser: "./a/index.js",
						default: "./b/index.js",
					},
				},
				"#a/index.mjs",
				["browser"],
			],
		},
		{
			name: "incorrect exports field #4",
			expect: [],
			suite: [
				{
					"#a/index.mjs": {
						browser: "./a/index.js",
						default: "./b/index.js",
					},
				},
				"#a/index",
				["browser"],
			],
		},
		// #endregion

		// #region Incorrect request

		{
			name: "incorrect request #1",
			expect: new Error('Request should start with "#"'),
			suite: [
				{
					"#a/": "./a/",
				},
				"/utils/index.mjs",
				[],
			],
		},
		{
			name: "incorrect request #2",
			expect: new Error('Request should start with "#"'),
			suite: [
				{
					"#a/": {
						browser: "./a/",
						default: "./b/",
					},
				},
				"./utils/index.mjs",
				["browser"],
			],
		},
		{
			name: "incorrect request #3",
			expect: new Error("Request should have at least 2 characters"),
			suite: [
				{
					"#a/": {
						browser: "./a/",
						default: "./b/",
					},
				},
				"#",
				["browser"],
			],
		},
		{
			name: "incorrect request #4",
			// Note: #/ patterns are now allowed per Node.js PR #60864
			// but #/ alone still fails because it ends with "/" (requesting directory)
			expect: new Error("Only requesting file allowed"),
			suite: [
				{
					"#a/": {
						browser: "./a/",
						default: "./b/",
					},
				},
				"#/",
				["browser"],
			],
		},
		{
			name: "incorrect request #5",
			expect: new Error("Only requesting file allowed"),
			suite: [
				{
					"#a/": {
						browser: "./a/",
						default: "./b/",
					},
				},
				"#a/",
				["browser"],
			],
		},
		// #endregion

		// #region #/ slash pattern (node.js PR #60864)
		// These tests cover the new Node.js behavior that allows #/ patterns
		// See: https://github.com/nodejs/node/pull/60864
		{
			name: "#/ slash pattern #1",
			// #/* pattern should map #/utils.js to ./src/utils.js
			expect: ["./src/utils.js"],
			suite: [
				{
					"#/*": "./src/*",
				},
				"#/utils.js",
				[],
			],
		},
		{
			name: "#/ slash pattern #2",
			// #/* pattern should map #/nested/deep.js to ./src/nested/deep.js
			expect: ["./src/nested/deep.js"],
			suite: [
				{
					"#/*": "./src/*",
				},
				"#/nested/deep.js",
				[],
			],
		},
		{
			name: "#/ slash pattern #3",
			// #/main direct mapping (starts with #/ but is not a wildcard)
			expect: ["./main.js"],
			suite: [
				{
					"#/main": "./main.js",
				},
				"#/main",
				[],
			],
		},
		{
			name: "#/ slash pattern #4",
			// Conditional mapping with #/* pattern
			expect: ["./browser/utils.js"],
			suite: [
				{
					"#/*": {
						browser: "./browser/*",
						default: "./src/*",
					},
				},
				"#/utils.js",
				["browser"],
			],
		},
		{
			name: "#/ slash pattern #5",
			// #/lib/ subpath folder mapping (legacy syntax with #/ prefix)
			expect: ["./lib/utils.js"],
			suite: [
				{
					"#/lib/": "./lib/",
				},
				"#/lib/utils.js",
				[],
			],
		},
		{
			name: "#/ slash pattern #6",
			// Symmetric exports/imports pattern as shown in Node.js PR
			expect: ["./src/index.js"],
			suite: [
				{
					"#/*": "./src/*",
				},
				"#/index.js",
				[],
			],
		},
		// #endregion

		// #region Directory imports targets may backtrack above the package base
		{
			name: "backtracking package base #1",
			expect: ["./dist/index"], // we don't handle backtracking here
			suite: [
				{
					"#a/../../utils/": "./dist/",
				},
				"#a/../../utils/index",
				[],
			],
		},
		{
			name: "backtracking package base #2",
			expect: ["./dist/../../utils/index"],
			suite: [
				{
					"#a/": "./dist/",
				},
				"#a/../../utils/index",
				[],
			],
		},
		{
			name: "backtracking package base #3",
			expect: ["../src/index"],
			suite: [
				{
					"#a/": "../src/",
				},
				"#a/index",
				[],
			],
		},
		{
			name: "backtracking package base #4",
			expect: ["./utils/../../../index"],
			suite: [
				{
					"#a/": {
						browser: "./utils/../../../",
					},
				},
				"#a/index",
				["browser"],
			],
		},
		// #endregion

		// #region Imports targets cannot map into a nested node_modules path
		{
			name: "nested node_modules path #1",
			expect: ["moment/node_modules/lodash/dist/index.js"], // we don't handle node_modules here
			suite: [
				{
					"#a/": {
						browser: "moment/node_modules/",
					},
				},
				"#a/lodash/dist/index.js",
				["browser"],
			],
		},
		{
			name: "nested node_modules path #2",
			expect: ["../node_modules/lodash/dist/index.js"],
			suite: [
				{
					"#a/": "../node_modules/",
				},
				"#a/lodash/dist/index.js",
				[],
			],
		},
		// #endregion

		// #region Nested mapping
		{
			name: "nested mapping #1",
			expect: [],
			suite: [
				{
					"#a/": {
						browser: {
							webpack: "./",
							default: {
								node: "./node/",
							},
						},
					},
				},
				"#a/index.js",
				["browser"],
			],
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
								node: "./node/",
							},
						},
					},
				},
				"#a/index.js",
				["browser", "webpack"],
			],
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
								node: "./node/",
							},
						},
					},
				},
				"#a/index.js",
				["webpack"],
			],
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
								node: "moment/node/",
							},
						},
					},
				},
				"#a/index.js",
				["node", "browser"],
			],
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
									webpack: ["./wpck/"],
								},
							},
						},
					},
				},
				"#a/index.js",
				["browser", "node"],
			],
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
									webpack: ["./wpck/"],
								},
							},
						},
					},
				},
				"#a/index.js",
				["browser", "node", "webpack"],
			],
		},
		{
			name: "nested mapping #7",
			expect: ["./y.js"],
			suite: [
				{
					"#a": {
						abc: { def: "./x.js" },
						ghi: "./y.js",
					},
				},
				"#a",
				["abc", "ghi"],
			],
		},
		{
			name: "nested mapping #8",
			expect: [],
			suite: [
				{
					"#a": {
						abc: { def: "./x.js", default: [] },
						ghi: "./y.js",
					},
				},
				"#a",
				["abc", "ghi"],
			],
		},
		// #endregion
	];

	for (const testCase of testCases) {
		it(testCase.name, () => {
			if (testCase.expect instanceof Error) {
				expect(() =>
					processImportsField(testCase.suite[0])(
						testCase.suite[1],
						new Set(testCase.suite[2]),
					),
				).toThrow(testCase.expect.message);
			} else {
				expect(
					processImportsField(testCase.suite[0])(
						testCase.suite[1],
						new Set(testCase.suite[2]),
					)[0],
				).toEqual(testCase.expect);
			}
		});
	}
});

describe("importsFieldPlugin", () => {
	const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

	const resolver = ResolverFactory.createResolver({
		extensions: [".js"],
		fileSystem: nodeFileSystem,
		mainFiles: ["index.js"],
		conditionNames: ["webpack"],
	});

	it("should resolve using imports field instead of self-referencing", (done) => {
		resolver.resolve({}, fixture, "#imports-field", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(path.resolve(fixture, "b.js"));
			done();
		});
	});

	it("should resolve using imports field instead of self-referencing for a subpath", (done) => {
		resolver.resolve(
			{},
			path.resolve(fixture, "dir"),
			"#imports-field",
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				expect(result).toEqual(path.resolve(fixture, "b.js"));
				done();
			},
		);
	});

	it("should disallow resolve out of package scope", (done) => {
		resolver.resolve({}, fixture, "#b", {}, (err, result) => {
			if (!err) return done(new Error(`expect error, got ${result}`));
			expect(err).toBeInstanceOf(Error);
			expect(err.message).toMatch(
				/Invalid "imports" target "\.\.\/b\.js" defined for "#b"/,
			);
			done();
		});
	});

	it("field name #1", (done) => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			fileSystem: nodeFileSystem,
			mainFiles: ["index.js"],
			importsFields: [["imports"]],
			conditionNames: ["webpack"],
		});

		resolver.resolve({}, fixture, "#imports-field", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(path.resolve(fixture, "b.js"));
			done();
		});
	});

	it("field name #2", (done) => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			fileSystem: nodeFileSystem,
			mainFiles: ["index.js"],
			importsFields: [["other", "imports"], "imports"],
			conditionNames: ["webpack"],
		});

		resolver.resolve({}, fixture, "#b", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(path.resolve(fixture, "a.js"));
			done();
		});
	});

	it("should resolve package #1", (done) => {
		resolver.resolve({}, fixture, "#a/dist/main.js", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				path.resolve(fixture, "node_modules/a/lib/main.js"),
			);
			done();
		});
	});

	it("should resolve package #2", (done) => {
		resolver.resolve({}, fixture, "#a", {}, (err, result) => {
			if (!err) return done(new Error(`expect error, got ${result}`));
			expect(err).toBeInstanceOf(Error);
			expect(err.message).toMatch(/is not imported from package/);
			done();
		});
	});

	it("should resolve package #3", (done) => {
		resolver.resolve({}, fixture, "#ccc/index.js", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(path.resolve(fixture, "node_modules/c/index.js"));
			done();
		});
	});

	it("should resolve package #4", (done) => {
		resolver.resolve({}, fixture, "#c", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(path.resolve(fixture, "node_modules/c/index.js"));
			done();
		});
	});

	it("should resolve absolute path as an imports field target", (done) => {
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
				if (!result) return done(new Error("No result"));
				expect(result).toEqual(file);
				done();
			});
		});
	});

	it("should log the correct info", (done) => {
		const log = [];
		resolver.resolve(
			{},
			fixture,
			"#a/dist/index.js",
			{ log: (v) => log.push(v) },
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				expect(result).toEqual(
					path.join(fixture, "node_modules/a/lib/index.js"),
				);
				expect(
					log.map((line) => line.replace(fixture, "...").replace(/\\/g, "/")),
				).toMatchSnapshot();
				done();
			},
		);
	});

	it("should resolve with wildcard pattern", (done) => {
		const fixture = path.resolve(
			__dirname,
			"./fixtures/imports-exports-wildcard/node_modules/m/",
		);
		resolver.resolve({}, fixture, "#internal/i.js", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(path.resolve(fixture, "./src/internal/i.js"));
			done();
		});
	});

	it("should work and throw an error on invalid imports #1", (done) => {
		// Note: #/ patterns are now allowed per Node.js PR #60864
		// #/dep will now try to resolve but fail because there's no mapping
		resolver.resolve({}, fixture, "#/dep", {}, (err, result) => {
			if (!err) return done(new Error(`expect error, got ${result}`));
			expect(err).toBeInstanceOf(Error);
			expect(err.message).toMatch(/is not imported from package/);
			done();
		});
	});

	it("should work and throw an error on invalid imports #2", (done) => {
		resolver.resolve({}, fixture, "#dep/", {}, (err, result) => {
			if (!err) return done(new Error(`expect error, got ${result}`));
			expect(err).toBeInstanceOf(Error);
			expect(err.message).toMatch(
				/Resolving to directories is not possible with the imports field \(request was #dep\/\)/,
			);
			done();
		});
	});

	it("should work with invalid imports #1", (done) => {
		resolver.resolve({}, fixture1, "#dep", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toBe(`${path.resolve(fixture1, "./a.js")}?foo=../`);
			done();
		});
	});

	it("should work with invalid imports #2", (done) => {
		resolver.resolve({}, fixture1, "#dep/foo/a.js", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toBe(`${path.resolve(fixture1, "./a.js")}?foo=../#../`);
			done();
		});
	});

	it("should work with invalid imports #3", (done) => {
		resolver.resolve({}, fixture1, "#dep/bar", {}, (err, result) => {
			if (!err) return done(new Error(`expect error, got ${result}`));
			expect(err).toBeInstanceOf(Error);
			expect(err.message).toMatch(/Can't resolve '#dep\/bar' in/);
			done();
		});
	});

	it("should work with invalid imports #4", (done) => {
		resolver.resolve({}, fixture1, "#dep/baz", {}, (err, result) => {
			if (!err) return done(new Error(`expect error, got ${result}`));
			expect(err).toBeInstanceOf(Error);
			expect(err.message).toMatch(/Can't resolve '#dep\/baz' in/);
			done();
		});
	});

	it("should work with invalid imports #5", (done) => {
		resolver.resolve({}, fixture1, "#dep/baz-multi", {}, (err, result) => {
			if (!err) return done(new Error(`expect error, got ${result}`));
			expect(err).toBeInstanceOf(Error);
			expect(err.message).toMatch(/Can't resolve '#dep\/baz-multi' in/);
			done();
		});
	});

	it("should work with invalid imports #6", (done) => {
		resolver.resolve({}, fixture1, "#dep/baz-multi", {}, (err, result) => {
			if (!err) return done(new Error(`expect error, got ${result}`));
			expect(err).toBeInstanceOf(Error);
			expect(err.message).toMatch(/Can't resolve '#dep\/baz-multi' in/);
			done();
		});
	});

	it("should work with invalid imports #7", (done) => {
		resolver.resolve({}, fixture1, "#dep/pattern/a.js", {}, (err, result) => {
			if (!err) return done(new Error(`expect error, got ${result}`));
			expect(err).toBeInstanceOf(Error);
			expect(err.message).toMatch(/Can't resolve '#dep\/pattern\/a.js' in/);
			done();
		});
	});

	it("should work with invalid imports #8", (done) => {
		resolver.resolve({}, fixture1, "#dep/array", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(path.resolve(fixture1, "./a.js"));
			done();
		});
	});

	it("should work with invalid imports #9", (done) => {
		resolver.resolve({}, fixture1, "#dep/array2", {}, (err, result) => {
			if (!err) return done(new Error(`expect error, got ${result}`));
			expect(err).toBeInstanceOf(Error);
			expect(err.message).toMatch(/Can't resolve '#dep\/array2' in/);
			done();
		});
	});

	it("should work with invalid imports #10", (done) => {
		resolver.resolve({}, fixture1, "#dep/array3", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(path.resolve(fixture1, "./a.js"));
			done();
		});
	});

	it("should work with invalid imports #11", (done) => {
		resolver.resolve({}, fixture1, "#dep/empty", {}, (err, result) => {
			if (!err) return done(new Error(`expect error, got ${result}`));
			expect(err).toBeInstanceOf(Error);
			expect(err.message).toMatch(/Can't resolve '#dep\/empty' in/);
			done();
		});
	});

	it("should work with invalid imports #12", (done) => {
		resolver.resolve({}, fixture1, "#dep/with-bad", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(path.resolve(fixture1, "./a.js"));
			done();
		});
	});

	it("should work with invalid imports #13", (done) => {
		resolver.resolve({}, fixture1, "#dep/with-bad2", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(path.resolve(fixture1, "./a.js"));
			done();
		});
	});

	it("should work with invalid imports #14", (done) => {
		resolver.resolve({}, fixture1, "#timezones/pdt.mjs", {}, (err, result) => {
			if (!err) return done(new Error(`expect error, got ${result}`));
			expect(err).toBeInstanceOf(Error);
			expect(err.message).toMatch(/Expecting folder to folder mapping/);
			done();
		});
	});

	it("should work with invalid imports #15", (done) => {
		resolver.resolve({}, fixture1, "#dep/multi1", {}, (err, result) => {
			if (!err) return done(new Error(`expect error, got ${result}`));
			expect(err).toBeInstanceOf(Error);
			expect(err.message).toMatch(
				/Invalid "imports" target "\.\.\/\.\.\/test\/foo" defined for "#dep\/multi1"/,
			);
			done();
		});
	});

	it("should work with invalid imports #16", (done) => {
		resolver.resolve({}, fixture1, "#dep/multi2", {}, (err, result) => {
			if (!err) return done(new Error(`expect error, got ${result}`));
			expect(err).toBeInstanceOf(Error);
			expect(err.message).toMatch(
				/Invalid "imports" target "\.\.\/\.\.\/test" defined for "#dep\/multi2"/,
			);
			done();
		});
	});

	it("should work with invalid imports #17", (done) => {
		resolver.resolve({}, fixture1, "#dep/multi1", {}, (err, result) => {
			if (!err) return done(new Error(`expect error, got ${result}`));
			expect(err).toBeInstanceOf(Error);
			expect(err.message).toMatch(
				/Invalid "imports" target "\.\.\/\.\.\/test\/foo" defined for "#dep\/multi1"/,
			);
			done();
		});
	});

	it("should work with invalid imports #18", (done) => {
		resolver.resolve({}, fixture1, "#dep/multi2", {}, (err, result) => {
			if (!err) return done(new Error(`expect error, got ${result}`));
			expect(err).toBeInstanceOf(Error);
			expect(err.message).toMatch(
				/Invalid "imports" target "\.\.\/\.\.\/test" defined for "#dep\/multi2"/,
			);
			done();
		});
	});

	it("should work and resolve with array imports", (done) => {
		resolver.resolve({}, fixture1, "#dep/multi", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(path.resolve(fixture1, "./a.js"));
			done();
		});
	});

	// Tests for #/ slash pattern support (node.js PR #60864)
	// These tests cover the new Node.js behavior that allows #/ patterns
	// See: https://github.com/nodejs/node/pull/60864
	describe("#/ slash pattern (node.js PR #60864)", () => {
		const slashPatternFixture = path.resolve(
			__dirname,
			"fixtures",
			"imports-slash-pattern",
		);

		it("should resolve #/utils.js using #/* pattern", (done) => {
			resolver.resolve(
				{},
				slashPatternFixture,
				"#/utils.js",
				{},
				(err, result) => {
					if (err) return done(err);
					if (!result) return done(new Error("No result"));
					expect(result).toEqual(
						path.resolve(slashPatternFixture, "src/utils.js"),
					);
					done();
				},
			);
		});

		it("should resolve #/nested/deep.js using #/* pattern", (done) => {
			resolver.resolve(
				{},
				slashPatternFixture,
				"#/nested/deep.js",
				{},
				(err, result) => {
					if (err) return done(err);
					if (!result) return done(new Error("No result"));
					expect(result).toEqual(
						path.resolve(slashPatternFixture, "src/nested/deep.js"),
					);
					done();
				},
			);
		});
	});
});
