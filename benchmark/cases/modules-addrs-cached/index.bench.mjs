/*
 * modules-addrs-cached
 *
 * Exercises the per-directories `addrs` cache in `ModulesUtils`. The
 * resolver is asked to resolve 8 different bare specifiers (pkg-a … pkg-h)
 * from the *same* 8-deep source directory. For each resolve the module
 * plugin has to expand the 9 ancestor directories × 1 `node_modules`
 * directory into a flat 9-entry `addrs` list. Without caching every resolve
 * re-computes `getPaths()` + `join()` for the same input; with caching the
 * full fan-out is built once and reused for every subsequent resolve from
 * the same directory.
 *
 * This is the common shape of real-world builds: one entry file triggers
 * many bare-specifier lookups, and webpack / Next-style monorepos have
 * deep source directories. Small per-resolve wins compound quickly there.
 */

import fs from "fs";
import path from "path";
import enhanced from "../../../lib/index.js";

const { ResolverFactory, CachedInputFileSystem } = enhanced;

/**
 * @param {import("tinybench").Bench} bench bench
 * @param {{ fixtureDir: string }} ctx ctx
 */
export default function register(bench, { fixtureDir }) {
	const fileSystem = new CachedInputFileSystem(fs, 30 * 1000);

	const resolver = ResolverFactory.createResolver({
		fileSystem,
		extensions: [".js"],
	});

	const deep = path.join(fixtureDir, "src/a/b/c/d/e/f/g/h");

	// All resolves share the same starting directory → the addrs cache
	// hits on 7/8 requests per iteration after the first (warmup) pass.
	const requests = [
		"pkg-a",
		"pkg-b",
		"pkg-c",
		"pkg-d",
		"pkg-e",
		"pkg-f",
		"pkg-g",
		"pkg-h",
	];

	const resolve = (req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, deep, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add(
		"modules-addrs-cached: 8 bare resolves from one 8-deep dir",
		async () => {
			for (const req of requests) {
				await resolve(req);
			}
		},
	);
}
