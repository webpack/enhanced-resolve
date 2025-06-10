import { defineConfig } from "eslint/config";
import config from "eslint-config-webpack";

export default defineConfig([
	{
		extends: [config],
		rules: {
			"n/prefer-global/process": "off",
			"n/prefer-node-protocol": "off",
		},
	},
]);
