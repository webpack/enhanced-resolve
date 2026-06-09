import { defineConfig, globalIgnores } from "eslint/config";
import config from "eslint-config-webpack";

export default defineConfig([
	globalIgnores(["benchmark/**/fixture/**"]),
	{
		extends: [config],
	},
	{
		files: ["benchmark/**/*"],
		languageOptions: {
			parserOptions: {
				ecmaVersion: 2022,
			},
		},
		rules: {
			"no-console": "off",
			"import/namespace": "off",
			"n/hashbang": "off",
			"n/no-unsupported-features/es-syntax": "off",
			"n/no-unsupported-features/node-builtins": "off",
			"n/no-process-exit": "off",
		},
	},
	{
		// Cross-runtime smoke scripts run standalone on node/bun/deno and in a
		// browser sandbox; relax library-grade JSDoc rules, allow console
		// output (they're CLI scripts) and skip the `engines.node` version
		// checks (these files target newer runtimes by design).
		files: ["test/smoke/**/*"],
		rules: {
			"jsdoc/no-restricted-syntax": "off",
			"jsdoc/reject-any-type": "off",
			"unicorn/prefer-native-coercion-functions": "off",
			"n/no-unsupported-features/es-builtins": "off",
			"n/no-unsupported-features/es-syntax": "off",
			"n/no-unsupported-features/node-builtins": "off",
			"no-console": "off",
		},
	},
	{
		// The test suite relies on `node:test` and modern `node:assert` helpers,
		// which are newer than the `engines.node` range the published library
		// targets. Tests are dev-only, so the builtin version check does not apply.
		files: ["test/*.js"],
		rules: {
			"n/no-unsupported-features/node-builtins": "off",
		},
	},
]);
