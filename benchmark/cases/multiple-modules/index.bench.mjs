/*
 * multiple-modules
 *
 * Exercises `modules: [...]` with a mix of relative (hierarchical) and
 * absolute (root) directories. Each entry spawns either a
 * `ModulesInHierarchicalDirectoriesPlugin` or a `ModulesInRootPlugin`,
 * and every bare specifier has to walk all of them in order until it
 * finds a match. Common pattern in monorepos with `shared/` or `libs/`
 * directories next to `node_modules`.
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

	const resolver = ResolverFactory.createResolver({
		fileSystem,
		extensions: [".js"],
		modules: [
			path.join(fixtureDir, "shared"),
			path.join(fixtureDir, "vendor"),
			"node_modules",
		],
	});

	const from = path.join(fixtureDir, "src");

	const requests = [
		"app-one", // hits shared/
		"app-two", // hits shared/
		"vendor-a", // hits vendor/
		"pkg-x", // hits node_modules (after walking shared + vendor first)
	];

	const resolve = (req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, from, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add(
		"multiple-modules: shared + vendor + node_modules (warm)",
		async () => {
			for (const req of requests) {
				await resolve(req);
			}
		},
	);
}
