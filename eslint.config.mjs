import { defineConfig } from "eslint/config";
import config from "eslint-config-webpack";

export default defineConfig([
	{
		// Benchmarks and their synthetic project fixtures are not part of the
		// shipped library and intentionally use loose/ES-module styles that
		// conflict with the base config. They have their own smoke test via
		// `npm run benchmark`.
		ignores: ["benchmark/"],
	},
	{
		extends: [config],
	},
]);
