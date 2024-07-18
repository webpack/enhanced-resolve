const path = require("path");
const fs = require("fs");
const { processExportsField } = require("../lib/util/entrypoints");
const ResolverFactory = require("../lib/ResolverFactory");
const CachedInputFileSystem = require("../lib/CachedInputFileSystem");

/** @typedef {import("../lib/util/entrypoints").ExportsField} ExportsField */

const fixture = path.resolve(__dirname, "fixtures", "exports-field");
const fixture2 = path.resolve(__dirname, "fixtures", "exports-field2");
const fixture3 = path.resolve(__dirname, "fixtures", "exports-field3");
const fixture4 = path.resolve(__dirname, "fixtures", "exports-field-error");
const fixture5 = path.resolve(
	__dirname,
	"fixtures",
	"exports-field-invalid-package-target"
);

describe("Process exports field", function exportsField() {
	/** @type {Array<{name: string, expect: string[]|Error, suite: [ExportsField, string, string[]]}>} */
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
			name: "sample #1 (wildcard)",
			expect: ["./dist/test/file.js", "./src/test/file.js"],
			suite: [
				{
					"./foo/*": {
						import: ["./dist/*", "./src/*"],
						webpack: "./wp/*"
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
			name: "sample #2 (wildcard)",
			expect: ["./data/timezones/pdt.mjs"],
			suite: [
				{
					"./timezones/*": "./data/timezones/*"
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
			name: "sample #3 (wildcard)",
			// mapping works like concatenating strings not file paths
			expect: ["./data/timezones/timezones/pdt.mjs"],
			suite: [
				{
					"./*": "./data/timezones/*.mjs"
				},
				"./timezones/pdt",
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
			name: "sample #4 (wildcard)",
			expect: [],
			suite: [
				{
					"./lib/*": {
						browser: ["./browser/*"]
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
			name: "sample #5 (wildcard)",
			expect: ["./browser/index.js"], // default condition used
			suite: [
				{
					"./lib/*": {
						browser: ["./browser/*"]
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
			name: "sample #7",
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
			name: "sample #7 (wildcard)",
			expect: [],
			suite: [
				{
					"./dist/a/a/*": "./dist/index.js"
				},
				"./dist/a/a",
				[]
			]
		},
		{
			name: "sample #8",
			expect: [],
			suite: [
				{
					".": "./index.js"
				},
				"./timezones/pdt.mjs",
				[]
			]
		},
		{
			name: "sample #9",
			expect: ["./main.js"],
			suite: [
				{
					"./index.js": "./main.js"
				},
				"./index.js",
				[]
			]
		},
		{
			name: "sample #10",
			expect: ["./ok.js"],
			suite: [
				{
					"./#foo": "./ok.js",
					"./module": "./ok.js",
					"./🎉": "./ok.js",
					"./%F0%9F%8E%89": "./other.js",
					"./bar#foo": "./ok.js",
					"./#zapp/": "./",
					"./#zipp*": "./zzz*"
				},
				"./#foo",
				[]
			]
		},
		{
			name: "sample #11",
			expect: ["./ok.js"],
			suite: [
				{
					"./#foo": "./ok.js",
					"./module": "./ok.js",
					"./🎉": "./ok.js",
					"./%F0%9F%8E%89": "./other.js",
					"./bar#foo": "./ok.js",
					"./#zapp/": "./",
					"./#zipp*": "./zzz*"
				},
				"./bar#foo",
				[]
			]
		},
		{
			name: "sample #12",
			expect: ["./ok.js#abc"],
			suite: [
				{
					"./#foo": "./ok.js",
					"./module": "./ok.js",
					"./🎉": "./ok.js",
					"./%F0%9F%8E%89": "./other.js",
					"./bar#foo": "./ok.js",
					"./#zapp/": "./",
					"./#zipp*": "./zzz*"
				},
				"./#zapp/ok.js#abc",
				[]
			]
		},
		{
			name: "sample #12",
			expect: ["./ok.js#abc"],
			suite: [
				{
					"./#foo": "./ok.js",
					"./module": "./ok.js",
					"./🎉": "./ok.js",
					"./%F0%9F%8E%89": "./other.js",
					"./bar#foo": "./ok.js",
					"./#zapp/": "./",
					"./#zipp*": "./zzz*"
				},
				"./#zapp/ok.js#abc",
				[]
			]
		},
		{
			name: "sample #13",
			expect: ["./ok.js?abc"],
			suite: [
				{
					"./#foo": "./ok.js",
					"./module": "./ok.js",
					"./🎉": "./ok.js",
					"./%F0%9F%8E%89": "./other.js",
					"./bar#foo": "./ok.js",
					"./#zapp/": "./",
					"./#zipp*": "./zzz*"
				},
				"./#zapp/ok.js?abc",
				[]
			]
		},
		{
			name: "sample #14",
			expect: ["./🎉.js"],
			suite: [
				{
					"./#foo": "./ok.js",
					"./module": "./ok.js",
					"./🎉": "./ok.js",
					"./%F0%9F%8E%89": "./other.js",
					"./bar#foo": "./ok.js",
					"./#zapp/": "./",
					"./#zipp*": "./zzz*"
				},
				"./#zapp/🎉.js",
				[]
			]
		},
		{
			name: "sample #15",
			expect: ["./%F0%9F%8E%89.js"],
			suite: [
				{
					"./#foo": "./ok.js",
					"./module": "./ok.js",
					"./🎉": "./ok.js",
					"./%F0%9F%8E%89": "./other.js",
					"./bar#foo": "./ok.js",
					"./#zapp/": "./",
					"./#zipp*": "./zzz*"
				},
				// "🎉" percent encoded
				"./#zapp/%F0%9F%8E%89.js",
				[]
			]
		},
		{
			name: "sample #16",
			expect: ["./ok.js"],
			suite: [
				{
					"./#foo": "./ok.js",
					"./module": "./ok.js",
					"./🎉": "./ok.js",
					"./%F0%9F%8E%89": "./other.js",
					"./bar#foo": "./ok.js",
					"./#zapp/": "./",
					"./#zipp*": "./zzz*"
				},
				"./🎉",
				[]
			]
		},
		{
			name: "sample #17",
			expect: ["./other.js"],
			suite: [
				{
					"./#foo": "./ok.js",
					"./module": "./ok.js",
					"./🎉": "./ok.js",
					"./%F0%9F%8E%89": "./other.js",
					"./bar#foo": "./ok.js",
					"./#zapp/": "./",
					"./#zipp*": "./zzz*"
				},
				"./%F0%9F%8E%89",
				[]
			]
		},
		{
			name: "sample #18",
			expect: ["./ok.js"],
			suite: [
				{
					"./#foo": "./ok.js",
					"./module": "./ok.js",
					"./🎉": "./ok.js",
					"./%F0%9F%8E%89": "./other.js",
					"./bar#foo": "./ok.js",
					"./#zapp/": "./",
					"./#zipp*": "./zzz*"
				},
				"./module",
				[]
			]
		},
		{
			name: "sample #19",
			expect: [],
			suite: [
				{
					"./#foo": "./ok.js",
					"./module": "./ok.js",
					"./🎉": "./ok.js",
					"./%F0%9F%8E%89": "./other.js",
					"./bar#foo": "./ok.js",
					"./#zapp/": "./",
					"./#zipp*": "./zzz*"
				},
				"./module#foo",
				[]
			]
		},
		{
			name: "sample #20",
			expect: [],
			suite: [
				{
					"./#foo": "./ok.js",
					"./module": "./ok.js",
					"./🎉": "./ok.js",
					"./%F0%9F%8E%89": "./other.js",
					"./bar#foo": "./ok.js",
					"./#zapp/": "./",
					"./#zipp*": "./zzz*"
				},
				"./module?foo",
				[]
			]
		},
		{
			name: "sample #21",
			expect: ["./zizizi"],
			suite: [
				{
					"./#foo": "./ok.js",
					"./module": "./ok.js",
					"./🎉": "./ok.js",
					"./%F0%9F%8E%89": "./other.js",
					"./bar#foo": "./ok.js",
					"./#zapp/": "./",
					"./#zipp*": "./z*z*z*"
				},
				"./#zippi",
				[]
			]
		},
		{
			name: "sample #22",
			expect: ["./d?e?f"],
			suite: [
				{
					"./a?b?c/": "./"
				},
				"./a?b?c/d?e?f",
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
					"./*": "./*",
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
					"./dist/*": "./dist/*",
					"./dist*": "./dist*",
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
					"./*": {
						browser: ["./browser/*"]
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
					"./*": {
						browser: ["./browser/*"]
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
			expect: ["./src/index.js"], // Default is first one
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
		{
			name: "Direct mapping #11",
			expect: ["./foo.js"],
			suite: [
				{
					"./": "./",
					"./*": "./*",
					"./dist/index.js": "./dist/index.js"
				},
				"./foo.js",
				[]
			]
		},
		{
			name: "Direct mapping #12",
			expect: ["./foo/bar/baz.js"],
			suite: [
				{
					"./": "./",
					"./*": "./*",
					"./dist/index.js": "./dist/index.js"
				},
				"./foo/bar/baz.js",
				[]
			]
		},
		{
			name: "Direct mapping #13",
			expect: ["./foo/bar/baz.js"],
			suite: [
				{
					"./": "./",
					"./dist/index.js": "./dist/index.js"
				},
				"./foo/bar/baz.js",
				[]
			]
		},
		{
			name: "Direct mapping #14",
			expect: ["./foo/bar/baz.js"],
			suite: [
				{
					"./*": "./*",
					"./dist/index.js": "./dist/index.js"
				},
				"./foo/bar/baz.js",
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
					".": [
						{ browser: "./browser.js" },
						{ require: "./require.js" },
						{ import: "./import.mjs" }
					]
				},
				".",
				[]
			]
		},
		{
			name: "Direct and conditional mapping #2",
			expect: ["./import.mjs"],
			suite: [
				{
					".": [
						{ browser: "./browser.js" },
						{ require: "./require.js" },
						{ import: "./import.mjs" }
					]
				},
				".",
				["import"]
			]
		},
		{
			name: "Direct and conditional mapping #3",
			expect: ["./require.js", "./import.mjs"],
			suite: [
				{
					".": [
						{ browser: "./browser.js" },
						{ require: "./require.js" },
						{ import: "./import.mjs" }
					]
				},
				".",
				["import", "require"]
			]
		},
		{
			name: "Direct and conditional mapping #4",
			expect: ["./require.js", "./import.mjs", "./import.js"],
			suite: [
				{
					".": [
						{ browser: "./browser.js" },
						{ require: ["./require.js"] },
						{ import: ["./import.mjs", "./import.js"] }
					]
				},
				".",
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
			name: "mapping to a folder root #3 (wildcard)",
			expect: ["./data/timezones/pdt/index.mjs"],
			suite: [
				{
					"./timezones/pdt/*": "./data/timezones/pdt/*"
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
			name: "mapping to a folder root #4 (wildcard)",
			expect: ["./timezones/pdt.mjs"],
			suite: [
				{
					"./*": "./timezones/*"
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
			name: "mapping to a folder root #5 (wildcard)",
			expect: ["./timezones/pdt.mjs"],
			suite: [
				{
					"./*": "./*"
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
		{
			name: "mapping to a folder root #7 (wildcard)",
			expect: [], // incorrect export field, but value did not processed
			suite: [
				{
					".": "./*"
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
			name: "the longest matching path prefix is prioritized #1 (wildcard)",
			// it does not work same as conditional mapping,
			// so there is no match for ./dist/index.mjs
			expect: ["./lib/index.mjs"],
			suite: [
				{
					"./*": "./*",
					"./dist/*": "./lib/*"
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
			name: "the longest matching path prefix is prioritized #2 (wildcard)",
			expect: ["./dist/utils/index.js"],
			suite: [
				{
					"./dist/utils/*": "./dist/utils/*",
					"./dist/*": "./lib/*"
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
			name: "the longest matching path prefix is prioritized #3 (wildcard)",
			// direct mapping is prioritize
			// it does not work same as conditional mapping,
			// so there is no match for ./dist/utils/index.mjs
			expect: ["./dist/utils/index.js"],
			suite: [
				{
					"./dist/utils/index.js": "./dist/utils/index.js",
					"./dist/utils/*": "./dist/utils/index.mjs",
					"./dist/*": "./lib/*"
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
		{
			name: "the longest matching path prefix is prioritized #4 (wildcard)",
			// it does not work same as conditional mapping,
			// even if right side is a conditional mapping,
			// so there is no match for ./browser/dist/index.mjs
			expect: ["./lib/index.mjs"],
			suite: [
				{
					"./*": {
						browser: "./browser/*"
					},
					"./dist/*": "./lib/*"
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
			name: "conditional mapping folder #1 (wildcard)",
			expect: ["lodash/index.js", "./utils/index.js"],
			suite: [
				{
					"./utils/*": {
						browser: ["lodash/*", "./utils/*"],
						node: ["./utils-node/*"]
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
			name: "conditional mapping folder #2 (wildcard)",
			expect: [], // no condition names
			suite: [
				{
					"./utils/*": {
						webpack: "./wpk/*",
						browser: ["lodash/*", "./utils/*"],
						node: ["./node/*"]
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
		{
			name: "conditional mapping folder #3 (wildcard)",
			expect: ["./wpk/index.mjs"],
			suite: [
				{
					"./utils/*": {
						webpack: "./wpk/*",
						browser: ["lodash/*", "./utils/*"],
						node: ["./utils/*"]
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
			name: "incorrect exports field #3 (wildcard)",
			expect: new Error(),
			suite: [
				{
					"./utils/*": {
						browser: "/a/",
						default: "/b/"
					}
				},
				"./utils/index.mjs",
				["browser"]
			]
		},
		{
			name: "incorrect exports field #4",
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
			name: "incorrect exports field #5",
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
			name: "incorrect exports field #6",
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
			name: "incorrect exports field #7",
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
		{
			name: "incorrect request #3",
			expect: new Error(),
			suite: [
				{
					"./utils/": {
						browser: "./a/",
						default: "./b/"
					}
				},
				"../utils/index.mjs",
				["browser"]
			]
		},
		{
			name: "incorrect request #4",
			expect: new Error(),
			suite: [
				{
					"./utils/": {
						browser: "./a/",
						default: "./b/"
					}
				},
				"/utils/index.mjs/",
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
			name: "backtracking package base #1 (wildcard)",
			expect: ["./dist/index"], // we don't handle backtracking here
			suite: [
				{
					"./../../utils/*": "./dist/*"
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
			name: "backtracking package base #2 (wildcard)",
			expect: new Error(),
			suite: [
				{
					"../../utils/*": "./dist/*"
				},
				"../../utils/index",
				[]
			]
		},
		{
			name: "backtracking package base #3",
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
			name: "backtracking package base #3 (wildcard)",
			expect: ["./../src/index"], // we don't handle backtracking here
			suite: [
				{
					"./utils/*": "./../src/*"
				},
				"./utils/index",
				[]
			]
		},
		{
			name: "backtracking package base #4",
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
			name: "backtracking package base #5",
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
			name: "backtracking package base #6",
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
			name: "backtracking package base #6 (wildcard)",
			expect: ["./utils/../index"],
			suite: [
				{
					"./utils/*": {
						browser: "./utils/../*"
					}
				},
				"./utils/index",
				["browser"]
			]
		},
		{
			name: "backtracking package base #7",
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
		{
			name: "backtracking package base #7 (wildcard)",
			expect: ["./dist/index"],
			suite: [
				{
					"./*": "./src/../../*",
					"./dist/*": "./dist/*"
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
			name: "backtracking target folder #1 (wildcard)",
			expect: ["./dist/timezone/../../index"],
			suite: [
				{
					"./utils/*": "./dist/*"
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
			name: "backtracking target folder #2 (wildcard)",
			expect: ["./dist/timezone/../index"],
			suite: [
				{
					"./utils/*": "./dist/*"
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
		{
			name: "backtracking target folder #3 (wildcard)",
			expect: ["./dist/target/../../index"],
			suite: [
				{
					"./utils/*": "./dist/target/*"
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
			name: "nested node_modules path #1 (wildcard)",
			expect: ["./node_modules/lodash/dist/index.js"], // we don't handle node_modules here
			suite: [
				{
					"./utils/*": {
						browser: "./node_modules/*"
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
		{
			name: "nested node_modules path #2 (wildcard)",
			expect: ["./utils/../node_modules/lodash/dist/index.js"],
			suite: [
				{
					"./utils/*": "./utils/../node_modules/*"
				},
				"./utils/lodash/dist/index.js",
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
			name: "nested mapping #1 (wildcard)",
			expect: [],
			suite: [
				{
					"./utils/*": {
						browser: {
							webpack: "./*",
							default: {
								node: "./node/*"
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
			name: "nested mapping #2 (wildcard)",
			expect: ["./index.js", "./node/index.js"],
			suite: [
				{
					"./utils/*": {
						browser: {
							webpack: ["./*", "./node/*"],
							default: {
								node: "./node/*"
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
			name: "nested mapping #3 (wildcard)",
			expect: [], // no browser condition name
			suite: [
				{
					"./utils/*": {
						browser: {
							webpack: ["./*", "./node/*"],
							default: {
								node: "./node/*"
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
			name: "nested mapping #4 (wildcard)",
			expect: ["./node/index.js"],
			suite: [
				{
					"./utils/*": {
						browser: {
							webpack: ["./*", "./node/*"],
							default: {
								node: "./node/*"
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
			name: "nested mapping #5 (wildcard)",
			expect: [],
			suite: [
				{
					"./utils/*": {
						browser: {
							webpack: ["./*", "./node/*"],
							default: {
								node: {
									webpack: ["./wpck/*"]
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
			name: "nested mapping #6 (wildcard)",
			expect: ["./index.js", "./node/index.js"],
			suite: [
				{
					"./utils/*": {
						browser: {
							webpack: ["./*", "./node/*"],
							default: {
								node: {
									webpack: ["./wpck/*"]
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
		},
		//#endregion

		//#region Syntax sugar
		{
			name: "syntax sugar #1",
			expect: ["./main.js"],
			suite: ["./main.js", ".", []]
		},
		{
			name: "syntax sugar #2",
			expect: [],
			suite: ["./main.js", "./lib.js", []]
		},
		{
			name: "syntax sugar #3",
			expect: ["./a.js", "./b.js"],
			suite: [["./a.js", "./b.js"], ".", []]
		},
		{
			name: "syntax sugar #4",
			expect: [],
			suite: [["./a.js", "./b.js"], "./lib.js", []]
		},
		{
			name: "syntax sugar #5",
			expect: ["./index.js"],
			suite: [
				{
					browser: {
						default: "./index.js"
					}
				},
				".",
				["browser"]
			]
		},
		{
			name: "syntax sugar #6",
			expect: [],
			suite: [
				{
					browser: {
						default: "./index.js"
					}
				},
				"./lib.js",
				["browser"]
			]
		},
		{
			name: "syntax sugar #7",
			expect: new Error(),
			suite: [
				{
					"./node": "./node.js",
					browser: {
						default: "./index.js"
					}
				},
				".",
				["browser"]
			]
		},
		{
			name: "syntax sugar #8",
			expect: new Error(),
			suite: [
				{
					browser: {
						default: "./index.js"
					},
					"./node": "./node.js"
				},
				".",
				["browser"]
			]
		},
		//#endregion

		//#region Wildcards
		{
			name: "wildcard longest #1",
			expect: ["./abc/d"],
			suite: [
				{
					"./ab*": "./ab/*",
					"./abc*": "./abc/*",
					"./a*": "./a/*"
				},
				"./abcd",
				["browser"]
			]
		},
		{
			name: "wildcard longest #2",
			expect: ["./abc/d/e"],
			suite: [
				{
					"./ab*": "./ab/*",
					"./abc*": "./abc/*",
					"./a*": "./a/*"
				},
				"./abcd/e",
				["browser"]
			]
		},
		{
			name: "wildcard longest #3",
			expect: ["./abc/d"],
			suite: [
				{
					"./x/ab*": "./ab/*",
					"./x/abc*": "./abc/*",
					"./x/a*": "./a/*"
				},
				"./x/abcd",
				["browser"]
			]
		},
		{
			name: "wildcard longest #4",
			expect: ["./abc/d/e"],
			suite: [
				{
					"./x/ab*": "./ab/*",
					"./x/abc*": "./abc/*",
					"./x/a*": "./a/*"
				},
				"./x/abcd/e",
				["browser"]
			]
		},

		//#endregion

		{
			name: "path tree edge case #1",
			expect: ["./A/b/d.js"],
			suite: [
				{
					"./a/": "./A/",
					"./a/b/c": "./c.js"
				},
				"./a/b/d.js",
				[]
			]
		},
		{
			name: "path tree edge case #1 (wildcard)",
			expect: ["./A/b/d.js"],
			suite: [
				{
					"./a/*": "./A/*",
					"./a/b/c": "./c.js"
				},
				"./a/b/d.js",
				[]
			]
		},
		{
			name: "path tree edge case #2",
			expect: ["./A/c.js"],
			suite: [
				{
					"./a/": "./A/",
					"./a/b": "./b.js"
				},
				"./a/c.js",
				[]
			]
		},
		{
			name: "path tree edge case #2 (wildcard)",
			expect: ["./A/c.js"],
			suite: [
				{
					"./a/*": "./A/*",
					"./a/b": "./b.js"
				},
				"./a/c.js",
				[]
			]
		},
		{
			name: "path tree edge case #3",
			expect: ["./A/b/d/c.js"],
			suite: [
				{
					"./a/": "./A/",
					"./a/b/c/d": "./c.js"
				},
				"./a/b/d/c.js",
				[]
			]
		},
		{
			name: "path tree edge case #3 (wildcard)",
			expect: ["./A/b/d/c.js"],
			suite: [
				{
					"./a/*": "./A/*",
					"./a/b/c/d": "./c.js"
				},
				"./a/b/d/c.js",
				[]
			]
		},
		{
			name: "wildcard pattern #1",
			expect: ["./A/b.js"],
			suite: [
				{
					"./a/*.js": "./A/*.js"
				},
				"./a/b.js",
				[]
			]
		},
		{
			name: "wildcard pattern #2",
			expect: ["./A/b/c.js"],
			suite: [
				{
					"./a/*.js": "./A/*.js"
				},
				"./a/b/c.js",
				[]
			]
		},
		{
			name: "wildcard pattern #3",
			expect: ["./A/b/c.js"],
			suite: [
				{
					"./a/*/c.js": "./A/*/c.js"
				},
				"./a/b/c.js",
				[]
			]
		},
		{
			name: "wildcard pattern #4",
			expect: ["./A/b/b.js"],
			suite: [
				{
					"./a/*/c.js": "./A/*/*.js"
				},
				"./a/b/c.js",
				[]
			]
		},
		{
			name: "wildcard pattern #5",
			expect: ["./browser/index.js"],
			suite: [
				{
					"./lib/*": {
						browser: ["./browser/*"]
					},
					"./dist/*.js": {
						node: "./*.js",
						default: "./browser/*.js"
					}
				},
				"./dist/index.js",
				["browser"]
			]
		},
		{
			name: "wildcard pattern #5",
			expect: ["./browser/index.js"],
			suite: [
				{
					"./lib/*": {
						browser: ["./browser/*"]
					},
					"./dist/*.js": {
						node: "./*.js",
						default: "./browser/*.js"
					}
				},
				"./lib/index.js",
				["browser"]
			]
		},
		{
			name: "wildcard pattern #6",
			expect: ["./browser/foo/bar.js"],
			suite: [
				{
					"./lib/*/bar.js": {
						browser: ["./browser/*/bar.js"]
					},
					"./dist/*/bar.js": {
						node: "./*.js",
						default: "./browser/*.js"
					}
				},
				"./lib/foo/bar.js",
				["browser"]
			]
		},
		{
			name: "wildcard pattern #6",
			expect: ["./browser/foo.js"],
			suite: [
				{
					"./lib/*/bar.js": {
						browser: ["./browser/*/bar.js"]
					},
					"./dist/*/bar.js": {
						node: "./*.js",
						default: "./browser/*.js"
					}
				},
				"./dist/foo/bar.js",
				["browser"]
			]
		},
		{
			name: "wildcard pattern #7",
			expect: ["./browser/foo/default.js"],
			suite: [
				{
					"./lib/*/bar.js": {
						browser: ["./browser/*/bar.js"]
					},
					"./dist/*/bar.js": {
						node: "./*.js",
						default: "./browser/*/default.js"
					}
				},
				"./dist/foo/bar.js",
				["default"]
			]
		},
		{
			name: "wildcard pattern #8",
			expect: ["./A/b/b/b.js"],
			suite: [
				{
					"./a/*/c.js": "./A/*/*/*.js"
				},
				"./a/b/c.js",
				[]
			]
		},
		{
			name: "wildcard pattern #9",
			expect: ["./A/b/b/b.js", "./B/b/b/b.js"],
			suite: [
				{
					"./a/*/c.js": ["./A/*/*/*.js", "./B/*/*/*.js"]
				},
				"./a/b/c.js",
				[]
			]
		},
		{
			name: "wildcard pattern #10",
			expect: ["./A/b/b/b.js"],
			suite: [
				{
					"./a/foo-*/c.js": "./A/*/*/*.js"
				},
				"./a/foo-b/c.js",
				[]
			]
		},
		{
			name: "wildcard pattern #11",
			expect: ["./A/b/b/b.js"],
			suite: [
				{
					"./a/*-foo/c.js": "./A/*/*/*.js"
				},
				"./a/b-foo/c.js",
				[]
			]
		},
		{
			name: "wildcard pattern #12",
			expect: ["./A/b/b/b.js"],
			suite: [
				{
					"./a/foo-*-foo/c.js": "./A/*/*/*.js"
				},
				"./a/foo-b-foo/c.js",
				[]
			]
		},
		{
			name: "wildcard pattern #13",
			expect: ["./A/b/c/d.js"],
			suite: [
				{
					"./a/foo-*-foo/c.js": "./A/b/c/d.js"
				},
				"./a/foo-b-foo/c.js",
				[]
			]
		},
		{
			name: "wildcard pattern #13",
			expect: ["./A/b/c/*.js"],
			suite: [
				{
					"./a/foo-foo/c.js": "./A/b/c/*.js"
				},
				"./a/foo-foo/c.js",
				[]
			]
		}
	];

	testCases.forEach(testCase => {
		it(testCase.name, () => {
			if (testCase.expect instanceof Error) {
				expect(() => {
					processExportsField(testCase.suite[0])(
						testCase.suite[1],
						new Set(testCase.suite[2])
					)[0];
				}).toThrowError();
			} else {
				expect(
					processExportsField(testCase.suite[0])(
						testCase.suite[1],
						new Set(testCase.suite[2])
					)[0]
				).toEqual(testCase.expect);
			}
		});
	});
});

describe("ExportsFieldPlugin", () => {
	const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

	const resolver = ResolverFactory.createResolver({
		extensions: [".js"],
		fileSystem: nodeFileSystem,
		fullySpecified: true,
		conditionNames: ["webpack"]
	});

	const commonjsResolver = ResolverFactory.createResolver({
		extensions: [".js"],
		fileSystem: nodeFileSystem,
		conditionNames: ["webpack"]
	});

	it("resolve root using exports field, not a main field", done => {
		resolver.resolve({}, fixture, "exports-field", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				path.resolve(fixture, "node_modules/exports-field/x.js")
			);
			done();
		});
	});

	it("resolve using exports field, not a browser field #1", done => {
		const resolver = ResolverFactory.createResolver({
			aliasFields: ["browser"],
			conditionNames: ["webpack"],
			extensions: [".js"],
			fileSystem: nodeFileSystem
		});

		resolver.resolve(
			{},
			fixture,
			"exports-field/dist/main.js",
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				expect(result).toEqual(
					path.resolve(fixture, "node_modules/exports-field/lib/lib2/main.js")
				);
				done();
			}
		);
	});

	it("resolve using exports field and a browser alias field #2", done => {
		const resolver = ResolverFactory.createResolver({
			aliasFields: ["browser"],
			extensions: [".js"],
			fileSystem: nodeFileSystem,
			conditionNames: ["node"]
		});

		resolver.resolve(
			{},
			fixture2,
			"exports-field/dist/main.js",
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				expect(result).toEqual(
					path.resolve(fixture2, "node_modules/exports-field/lib/browser.js")
				);
				done();
			}
		);
	});

	it("throw error if extension not provided", done => {
		resolver.resolve(
			{},
			fixture2,
			"exports-field/dist/main",
			{},
			(err, result) => {
				if (!err) return done(new Error(`expect error, got ${result}`));
				expect(err).toBeInstanceOf(Error);
				expect(err.message).toMatch(/Can't resolve/);
				done();
			}
		);
	});

	it("throw error if extension not provided", done => {
		resolver.resolve(
			{},
			fixture2,
			"exports-field/dist/main",
			{},
			(err, result) => {
				if (!err) return done(new Error(`expect error, got ${result}`));
				expect(err).toBeInstanceOf(Error);
				expect(err.message).toMatch(/Can't resolve/);
				done();
			}
		);
	});

	it("should resolve extension without fullySpecified", done => {
		commonjsResolver.resolve(
			{},
			fixture2,
			"exports-field/dist/main",
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				expect(result).toEqual(
					path.resolve(fixture2, "node_modules/exports-field/lib/lib2/main.js")
				);
				done();
			}
		);
	});

	it("resolver should respect condition names", done => {
		resolver.resolve(
			{},
			fixture,
			"exports-field/dist/main.js",
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				expect(result).toEqual(
					path.resolve(fixture, "node_modules/exports-field/lib/lib2/main.js")
				);
				done();
			}
		);
	});

	it("resolver should respect fallback", done => {
		resolver.resolve(
			{},
			fixture2,
			"exports-field/dist/browser.js",
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				expect(result).toEqual(
					path.resolve(fixture2, "node_modules/exports-field/lib/browser.js")
				);
				done();
			}
		);
	});

	it("resolver should respect query parameters #1", done => {
		resolver.resolve(
			{},
			fixture2,
			"exports-field/dist/browser.js?foo",
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				expect(result).toEqual(
					path.resolve(
						fixture2,
						"node_modules/exports-field/lib/browser.js?foo"
					)
				);
				done();
			}
		);
	});

	it("resolver should respect query parameters #2. Direct matching", done => {
		resolver.resolve({}, fixture2, "exports-field?foo", {}, (err, result) => {
			if (!err) return done(new Error(`expect error, got ${result}`));
			expect(err).toBeInstanceOf(Error);
			expect(err.message).toMatch(/Package path \.\/\?foo is not exported/);
			done();
		});
	});

	it("resolver should respect fragment parameters #1", done => {
		resolver.resolve(
			{},
			fixture2,
			"exports-field/dist/browser.js#foo",
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				expect(result).toEqual(
					path.resolve(
						fixture2,
						"node_modules/exports-field/lib/browser.js#foo"
					)
				);
				done();
			}
		);
	});

	it("resolver should respect fragment parameters #2. Direct matching", done => {
		resolver.resolve({}, fixture2, "exports-field#foo", {}, (err, result) => {
			if (!err) return done(new Error(`expect error, got ${result}`));
			expect(err).toBeInstanceOf(Error);
			expect(err.message).toMatch(/Package path \.\/#foo is not exported/);
			done();
		});
	});

	it("relative path should work, if relative path as request is used", done => {
		resolver.resolve(
			{},
			fixture,
			"./node_modules/exports-field/lib/main.js",
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				expect(result).toEqual(
					path.resolve(fixture, "node_modules/exports-field/lib/main.js")
				);
				done();
			}
		);
	});

	it("relative path should not work with exports field", done => {
		resolver.resolve(
			{},
			fixture,
			"./node_modules/exports-field/dist/main.js",
			{},
			(err, result) => {
				if (!err) return done(new Error(`expect error, got ${result}`));
				expect(err).toBeInstanceOf(Error);
				expect(err.message).toMatch(/Can't resolve/);
				done();
			}
		);
	});

	it("backtracking should not work for request", done => {
		resolver.resolve(
			{},
			fixture,
			"exports-field/dist/../../../a.js",
			{},
			(err, result) => {
				if (!err) return done(new Error(`expect error, got ${result}`));
				expect(err).toBeInstanceOf(Error);
				expect(err.message).toMatch(/Can't resolve/);
				done();
			}
		);
	});

	it("backtracking should not work for exports field target", done => {
		resolver.resolve(
			{},
			fixture,
			"exports-field/dist/a.js",
			{},
			(err, result) => {
				if (!err) return done(new Error(`expect error, got ${result}`));
				expect(err).toBeInstanceOf(Error);
				expect(err.message).toMatch(/out of package scope/);
				done();
			}
		);
	});

	it("self-resolving root", done => {
		resolver.resolve({}, fixture, "@exports-field/core", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(path.resolve(fixture, "./a.js"));
			done();
		});
	});

	it("not exported error", done => {
		resolver.resolve(
			{},
			fixture,
			"exports-field/anything/else",
			{},
			(err, result) => {
				if (!err) return done(new Error(`expect error, got ${result}`));
				expect(err).toBeInstanceOf(Error);
				expect(err.message).toMatch(/not exported from package/);
				done();
			}
		);
	});

	it("field name path #1", done => {
		const resolver = ResolverFactory.createResolver({
			aliasFields: ["browser"],
			exportsFields: [["exportsField", "exports"]],
			extensions: [".js"],
			fileSystem: nodeFileSystem
		});

		resolver.resolve({}, fixture3, "exports-field", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				path.resolve(fixture3, "node_modules/exports-field/main.js")
			);
			done();
		});
	});

	it("field name path #2", done => {
		const resolver = ResolverFactory.createResolver({
			aliasFields: ["browser"],
			exportsFields: [["exportsField", "exports"], "exports"],
			extensions: [".js"],
			fileSystem: nodeFileSystem
		});

		resolver.resolve({}, fixture3, "exports-field", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				path.resolve(fixture3, "node_modules/exports-field/main.js")
			);
			done();
		});
	});

	it("field name path #3", done => {
		const resolver = ResolverFactory.createResolver({
			aliasFields: ["browser"],
			exportsFields: ["exports", ["exportsField", "exports"]],
			extensions: [".js"],
			fileSystem: nodeFileSystem
		});

		resolver.resolve({}, fixture3, "exports-field", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				path.resolve(fixture3, "node_modules/exports-field/main.js")
			);
			done();
		});
	});

	it("field name path #4", done => {
		const resolver = ResolverFactory.createResolver({
			aliasFields: ["browser"],
			exportsFields: [["exports"]],
			extensions: [".js"],
			fileSystem: nodeFileSystem
		});

		resolver.resolve({}, fixture2, "exports-field", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				path.resolve(fixture2, "node_modules/exports-field/index.js")
			);
			done();
		});
	});

	it("field name path #5", done => {
		const resolver = ResolverFactory.createResolver({
			aliasFields: ["browser"],
			exportsFields: ["ex", ["exportsField", "exports"]],
			extensions: [".js"],
			fileSystem: nodeFileSystem
		});

		resolver.resolve({}, fixture3, "exports-field", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				path.resolve(fixture3, "node_modules/exports-field/index")
			);
			done();
		});
	});

	it("request ending with slash #1", done => {
		resolver.resolve({}, fixture, "exports-field/", {}, (err, result) => {
			if (!err) return done(new Error(`expect error, got ${result}`));
			expect(err).toBeInstanceOf(Error);
			expect(err.message).toMatch(/Resolving to directories is not possible/);
			done();
		});
	});

	it("request ending with slash #2", done => {
		resolver.resolve({}, fixture, "exports-field/dist/", {}, (err, result) => {
			if (!err) return done(new Error(`expect error, got ${result}`));
			expect(err).toBeInstanceOf(Error);
			expect(err.message).toMatch(/Resolving to directories is not possible/);
			done();
		});
	});

	it("request ending with slash #3", done => {
		resolver.resolve({}, fixture, "exports-field/lib/", {}, (err, result) => {
			if (!err) return done(new Error(`expect error, got ${result}`));
			expect(err).toBeInstanceOf(Error);
			expect(err.message).toMatch(/Resolving to directories is not possible/);
			done();
		});
	});

	it("should throw error if target is invalid", done => {
		resolver.resolve({}, fixture4, "exports-field", {}, (err, result) => {
			if (!err) return done(new Error(`expect error, got ${result}`));
			expect(err).toBeInstanceOf(Error);
			expect(err.message).toMatch(/Trying to access out of package scope/);
			done();
		});
	});

	it("throw error if exports field is invalid", done => {
		resolver.resolve(
			{},
			fixture,
			"invalid-exports-field",
			{},
			(err, result) => {
				if (!err) return done(new Error(`expect error, got ${result}`));
				expect(err).toBeInstanceOf(Error);
				expect(err.message).toMatch(/should be relative path/);
				expect(err.message).toMatch(/umd/);
				done();
			}
		);
	});

	it("should log the correct info", done => {
		const log = [];
		resolver.resolve(
			{},
			fixture,
			"exports-field/dist/browser.js",
			{ log: v => log.push(v) },
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				expect(result).toEqual(
					path.resolve(fixture, "node_modules/exports-field/lib/browser.js")
				);
				expect(
					log.map(line => line.replace(fixture, "...").replace(/\\/g, "/"))
				).toMatchSnapshot();
				done();
			}
		);
	});

	it("should resolve with wildcard pattern #1", done => {
		const fixture = path.resolve(
			__dirname,
			"./fixtures/imports-exports-wildcard/"
		);

		resolver.resolve({}, fixture, "m/features/f.js", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				path.resolve(fixture, "./node_modules/m/src/features/f.js")
			);
			done();
		});
	});

	it("should resolve with wildcard pattern #2", done => {
		const fixture = path.resolve(
			__dirname,
			"./fixtures/imports-exports-wildcard/"
		);

		resolver.resolve({}, fixture, "m/features/y/y.js", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				path.resolve(fixture, "./node_modules/m/src/features/y/y.js")
			);
			done();
		});
	});

	it("should resolve with wildcard pattern #2", done => {
		const fixture = path.resolve(
			__dirname,
			"./fixtures/imports-exports-wildcard/"
		);

		resolver.resolve({}, fixture, "m/features/y/y.js", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				path.resolve(fixture, "./node_modules/m/src/features/y/y.js")
			);
			done();
		});
	});

	it("should resolve with wildcard pattern #3", done => {
		const fixture = path.resolve(
			__dirname,
			"./fixtures/imports-exports-wildcard/"
		);

		resolver.resolve(
			{},
			fixture,
			"m/features-no-ext/y/y.js",
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				expect(result).toEqual(
					path.resolve(fixture, "./node_modules/m/src/features/y/y.js")
				);
				done();
			}
		);
	});

	it("should resolve with wildcard pattern #4", done => {
		const fixture = path.resolve(
			__dirname,
			"./fixtures/imports-exports-wildcard/"
		);

		resolver.resolve({}, fixture, "m/middle/nested/f.js", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				path.resolve(fixture, "./node_modules/m/src/middle/nested/f.js")
			);
			done();
		});
	});

	it("should resolve with wildcard pattern #5", done => {
		const fixture = path.resolve(
			__dirname,
			"./fixtures/imports-exports-wildcard/"
		);

		resolver.resolve(
			{},
			fixture,
			"m/middle-1/nested/f.js",
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				expect(result).toEqual(
					path.resolve(fixture, "./node_modules/m/src/middle-1/nested/f.js")
				);
				done();
			}
		);
	});

	it("should resolve with wildcard pattern #6", done => {
		const fixture = path.resolve(
			__dirname,
			"./fixtures/imports-exports-wildcard/"
		);

		resolver.resolve(
			{},
			fixture,
			"m/middle-2/nested/f.js",
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				expect(result).toEqual(
					path.resolve(fixture, "./node_modules/m/src/middle-2/nested/f.js")
				);
				done();
			}
		);
	});

	it("should resolve with wildcard pattern #7", done => {
		const fixture = path.resolve(
			__dirname,
			"./fixtures/imports-exports-wildcard/"
		);

		resolver.resolve({}, fixture, "m/middle-3/nested/f", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				path.resolve(
					fixture,
					"./node_modules/m/src/middle-3/nested/f/nested/f.js"
				)
			);
			done();
		});
	});

	it("should resolve with wildcard pattern #8", done => {
		const fixture = path.resolve(
			__dirname,
			"./fixtures/imports-exports-wildcard/"
		);

		resolver.resolve({}, fixture, "m/middle-4/f/nested", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				path.resolve(fixture, "./node_modules/m/src/middle-4/f/f.js")
			);
			done();
		});
	});

	it("should resolve with wildcard pattern #9", done => {
		const fixture = path.resolve(
			__dirname,
			"./fixtures/imports-exports-wildcard/"
		);

		resolver.resolve({}, fixture, "m/middle-5/f$/$", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				path.resolve(fixture, "./node_modules/m/src/middle-5/f$/$.js")
			);
			done();
		});
	});

	it("should throw error if target is 'null'", done => {
		const fixture = path.resolve(
			__dirname,
			"./fixtures/imports-exports-wildcard/"
		);

		resolver.resolve(
			{},
			fixture,
			"m/features/internal/file.js",
			{},
			(err, result) => {
				if (!err) return done(new Error(`expect error, got ${result}`));
				expect(err).toBeInstanceOf(Error);
				expect(err.message).toMatch(
					/Package path \.\/features\/internal\/file\.js is not exported/
				);
				done();
			}
		);
	});

	it("should resolve with the `extensionAlias` option", done => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			extensionAlias: {
				".js": [".ts", ".js"]
			},
			fileSystem: nodeFileSystem,
			fullySpecified: true,
			conditionNames: ["webpack", "default"]
		});
		const fixture = path.resolve(
			__dirname,
			"./fixtures/exports-field-and-extension-alias/"
		);

		resolver.resolve({}, fixture, "@org/pkg/string.js", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				path.resolve(fixture, "./node_modules/@org/pkg/dist/string.js")
			);
			done();
		});
	});

	it("should resolve with the `extensionAlias` option #2", done => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			extensionAlias: {
				".js": [".ts", ".js"]
			},
			fileSystem: nodeFileSystem,
			fullySpecified: true,
			conditionNames: ["webpack", "default"]
		});
		const fixture = path.resolve(
			__dirname,
			"./fixtures/exports-field-and-extension-alias/"
		);

		resolver.resolve({}, fixture, "pkg/string.js", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				path.resolve(fixture, "./node_modules/pkg/dist/string.js")
			);
			done();
		});
	});

	it("should resolve with the `extensionAlias` option #3", done => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			extensionAlias: {
				".js": [".foo", ".baz", ".baz", ".ts", ".js"]
			},
			fileSystem: nodeFileSystem,
			fullySpecified: true,
			conditionNames: ["webpack", "default"]
		});
		const fixture = path.resolve(
			__dirname,
			"./fixtures/exports-field-and-extension-alias/"
		);

		resolver.resolve({}, fixture, "pkg/string.js", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				path.resolve(fixture, "./node_modules/pkg/dist/string.js")
			);
			done();
		});
	});

	it("should throw error with the `extensionAlias` option", done => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			extensionAlias: {
				".js": [".ts"]
			},
			fileSystem: nodeFileSystem,
			fullySpecified: true,
			conditionNames: ["webpack", "default"]
		});
		const fixture = path.resolve(
			__dirname,
			"./fixtures/exports-field-and-extension-alias/"
		);

		resolver.resolve({}, fixture, "pkg/string.js", {}, (err, result) => {
			if (!err) return done(new Error(`expect error, got ${result}`));
			expect(err).toBeInstanceOf(Error);
			expect(err.message).toMatch(
				/Package path \.\/string\.ts is not exported/
			);
			done();
		});
	});

	it("should throw error with the `extensionAlias` option #2", done => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			extensionAlias: {
				".js": ".ts"
			},
			fileSystem: nodeFileSystem,
			fullySpecified: true,
			conditionNames: ["webpack", "default"]
		});
		const fixture = path.resolve(
			__dirname,
			"./fixtures/exports-field-and-extension-alias/"
		);

		resolver.resolve({}, fixture, "pkg/string.js", {}, (err, result) => {
			if (!err) return done(new Error(`expect error, got ${result}`));
			expect(err).toBeInstanceOf(Error);
			expect(err.message).toMatch(
				/Package path \.\/string\.ts is not exported/
			);
			done();
		});
	});

	it("invalid package target #1", done => {
		resolver.resolve(
			{},
			fixture5,
			"@exports-field/bad-specifier",
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				expect(result).toEqual(path.resolve(fixture5, "./a.js") + "?foo=../");
				done();
			}
		);
	});

	it("invalid package target #2", done => {
		resolver.resolve(
			{},
			fixture5,
			"@exports-field/bad-specifier/foo/file.js",
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				expect(result).toEqual(
					path.resolve(fixture5, "./a.js") + "?foo=../#../"
				);
				done();
			}
		);
	});

	it("invalid package target #3", done => {
		resolver.resolve(
			{},
			fixture5,
			"@exports-field/bad-specifier/bar",
			{},
			(err, result) => {
				if (!err) return done(new Error(`expect error, got ${result}`));
				expect(err).toBeInstanceOf(Error);
				expect(err.message).toMatch(
					/Invalid "exports" target "-bad-specifier-" defined for "\.\/bar"/
				);
				done();
			}
		);
	});

	it("invalid package target #4", done => {
		resolver.resolve(
			{},
			fixture5,
			"@exports-field/bad-specifier/baz-multi",
			{},
			(err, result) => {
				if (!err) return done(new Error(`expect error, got ${result}`));
				expect(err).toBeInstanceOf(Error);
				expect(err.message).toMatch(/Can't resolve/);
				done();
			}
		);
	});

	it("invalid package target #5", done => {
		resolver.resolve(
			{},
			fixture5,
			"@exports-field/bad-specifier/pattern/a.js",
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				expect(result).toEqual(path.resolve(fixture5, "./a.js"));
				done();
			}
		);
	});

	it("invalid package target #6", done => {
		resolver.resolve(
			{},
			fixture5,
			"@exports-field/bad-specifier/slash",
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				expect(result).toEqual(path.resolve(fixture5, "./a.js"));
				done();
			}
		);
	});

	it("invalid package target #7", done => {
		resolver.resolve(
			{},
			fixture5,
			"@exports-field/bad-specifier/no-slash",
			{},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				expect(result).toEqual(path.resolve(fixture5, "./a.js"));
				done();
			}
		);
	});

	it("invalid package target #8", done => {
		resolver.resolve(
			{},
			fixture5,
			"@exports-field/bad-specifier/utils/index.mjs",
			{},
			(err, result) => {
				if (!err) return done(new Error(`expect error, got ${result}`));
				expect(err).toBeInstanceOf(Error);
				expect(err.message).toMatch(
					/Invalid "exports" target "\/b\/index\.mjs" defined for "\.\/utils\//
				);
				done();
			}
		);
	});

	it("invalid package target #9", done => {
		resolver.resolve(
			{},
			fixture5,
			"@exports-field/bad-specifier/utils1/index.mjs",
			{},
			(err, result) => {
				if (!err) return done(new Error(`expect error, got ${result}`));
				expect(err).toBeInstanceOf(Error);
				expect(err.message).toMatch(
					/Invalid "exports" target "\/a\/index.mjs" defined for "\.\/utils1\/"/
				);
				done();
			}
		);
	});

	it("invalid package target #10", done => {
		resolver.resolve(
			{},
			fixture5,
			"@exports-field/bad-specifier/utils2/index",
			{},
			(err, result) => {
				if (!err) return done(new Error(`expect error, got ${result}`));
				expect(err).toBeInstanceOf(Error);
				expect(err.message).toMatch(
					/Invalid "exports" target "\.\.\/this\/index" defined for "\.\/utils2\/"/
				);
				done();
			}
		);
	});

	it("invalid package target #11", done => {
		resolver.resolve(
			{},
			fixture5,
			"@exports-field/bad-specifier/utils3/index",
			{},
			(err, result) => {
				if (!err) return done(new Error(`expect error, got ${result}`));
				expect(err).toBeInstanceOf(Error);
				expect(err.message).toMatch(
					/Invalid "exports" target "\.\.\/this\/index" defined for "\.\/utils3\/\*"/
				);
				done();
			}
		);
	});

	it("invalid package target #12", done => {
		resolver.resolve(
			{},
			fixture5,
			"@exports-field/bad-specifier/utils4/index",
			{},
			(err, result) => {
				if (!err) return done(new Error(`expect error, got ${result}`));
				expect(err).toBeInstanceOf(Error);
				expect(err.message).toMatch(
					/Invalid "exports" target "\.\.\/src\/index" defined for "\.\/utils4\/\*"/
				);
				done();
			}
		);
	});

	it("invalid package target #13", done => {
		resolver.resolve(
			{},
			fixture5,
			"@exports-field/bad-specifier/utils5/index",
			{},
			(err, result) => {
				if (!err) return done(new Error(`expect error, got ${result}`));
				expect(err).toBeInstanceOf(Error);
				expect(err.message).toMatch(
					/Invalid "exports" target "\.\.\/src\/index" defined for "\.\/utils5\/"/
				);
				done();
			}
		);
	});

	it("invalid package target #14", done => {
		resolver.resolve(
			{},
			fixture5,
			"@exports-field/bad-specifier/timezones/pdt.mjs",
			{},
			(err, result) => {
				if (!err) return done(new Error(`expect error, got ${result}`));
				expect(err).toBeInstanceOf(Error);
				expect(err.message).toMatch(
					/Invalid "exports" target "\." defined for "\.\/\*"/
				);
				done();
			}
		);
	});
});
