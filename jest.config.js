"use strict";

module.exports = {
	moduleNameMapper:
		typeof process.env.ES_MODULE_BUNDLE_TEST !== "undefined"
			? {
					"^enhanced-resolve$": "<rootDir>/test/outputs/umd-library/main.js",
				}
			: {},
	prettierPath: require.resolve("prettier-2"),
	moduleFileExtensions: ["js", "mjs", "cjs", "ts"],
};
