/*
 * extensions-many
 *
 * Exercises the AppendPlugin / TryNextPlugin path for extension resolution
 * with a long list of candidate extensions. Each resolver tries each
 * extension in order, so a request that ends up matching only the last
 * extension (`.jsx`) has to walk past all the preceding ones. This is the
 * relevant workload for projects that configure many extensions.
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
		extensions: [".ts", ".tsx", ".mjs", ".js", ".jsx", ".json"],
	});

	const from = path.join(fixtureDir, "src");

	// Request list deliberately hits extensions at different positions in
	// the list, including the last one (.json / .jsx) where the extension
	// loop has to walk the furthest.
	const requests = [
		"./a", // .js (middle)
		"./b", // .json (last)
		"./c", // .mjs
		"./d", // .ts (first)
		"./e", // .tsx (second)
		"./f", // .jsx (near end)
	];

	const resolve = (req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, from, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add("extensions-many: 6-extension list (warm)", async () => {
		for (const req of requests) {
			await resolve(req);
		}
	});
}
