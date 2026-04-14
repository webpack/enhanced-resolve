/*
 * exports-field
 *
 * Exercises the ExportsFieldPlugin with a package that has:
 *   - nested condition maps (node/default, import/require, types)
 *   - pattern (wildcard) subpath exports like `./features/*`
 *   - pattern exports that match `*.js` extensions
 *   - a plain string mapping (`./legacy`)
 *   - a package.json re-export
 *
 * Uses two separate resolvers with different condition sets so we get both
 * the "require" and "import" branch of the hot exports matching code.
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

	const requireResolver = ResolverFactory.createResolver({
		fileSystem,
		extensions: [".js"],
		conditionNames: ["node", "require"],
	});

	const importResolver = ResolverFactory.createResolver({
		fileSystem,
		extensions: [".js"],
		conditionNames: ["node", "import"],
	});

	const requests = [
		"complex-exports",
		"complex-exports/features/alpha",
		"complex-exports/features/beta",
		"complex-exports/features/gamma",
		"complex-exports/features/delta",
		"complex-exports/internal/util1.js",
		"complex-exports/internal/util2.js",
		"complex-exports/internal/util3.js",
		"complex-exports/legacy",
		"complex-exports/package.json",
	];

	const resolve = (resolver, req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, fixtureDir, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add("exports-field: conditions=require,node (warm)", async () => {
		for (const req of requests) {
			await resolve(requireResolver, req);
		}
	});

	bench.add("exports-field: conditions=import,node (warm)", async () => {
		for (const req of requests) {
			await resolve(importResolver, req);
		}
	});
}
