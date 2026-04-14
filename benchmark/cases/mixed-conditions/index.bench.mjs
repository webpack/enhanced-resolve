/*
 * mixed-conditions
 *
 * Stress the exports-field condition matcher with a deeply nested
 * condition map (browser/development/production, node/import/require,
 * worker, react-native, types, default) resolved under four different
 * `conditionNames` configurations. Each resolver hits a different branch
 * of the condition tree, so together they exercise the condition walker.
 */

import fs from "fs";
import path from "path";
import enhanced from "../../../lib/index.js";

const { ResolverFactory, CachedInputFileSystem } = enhanced;

/**
 * @param {import('tinybench').Bench} bench
 * @param {{ fixtureDir: string }} ctx
 */
export default function register(bench, { fixtureDir }) {
	const fileSystem = new CachedInputFileSystem(fs, 4000);

	/**
	 * @param {string[]} conditionNames
	 */
	const makeResolver = (conditionNames) =>
		ResolverFactory.createResolver({
			fileSystem,
			extensions: [".js"],
			conditionNames,
		});

	const resolvers = [
		makeResolver(["node", "require", "production"]),
		makeResolver(["node", "import", "development"]),
		makeResolver(["browser", "production"]),
		makeResolver(["worker", "import"]),
	];

	const from = fixtureDir;
	const request = "conditional-pkg";

	const resolve = (resolver) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, from, request, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error("no result"));
				resolve(result);
			});
		});

	bench.add(
		"mixed-conditions: 4 condition sets against nested exports",
		async () => {
			// Rotate through each resolver configuration so every condition
			// branch gets exercised in a single iteration.
			for (const resolver of resolvers) {
				await resolve(resolver);
			}
		},
	);
}
