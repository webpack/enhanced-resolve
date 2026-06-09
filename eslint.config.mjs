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
		// browser sandbox; relax the library-grade JSDoc typing rules for them.
		files: ["test/smoke/**/*"],
		rules: {
			"jsdoc/no-restricted-syntax": "off",
			"jsdoc/reject-any-type": "off",
			"unicorn/prefer-native-coercion-functions": "off",
		},
	},
]);
