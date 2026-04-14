/*
 * deep-hierarchy
 *
 * Resolves a bare specifier from 10 directory levels deep. The
 * ModulesInHierarchicalDirectoriesPlugin walks up the tree checking
 * `<level>/node_modules/<name>` at each step, so the cold-start cost grows
 * linearly with depth. This exercises that walk specifically.
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
	});

	const deep = path.join(fixtureDir, "src/a/b/c/d/e/f/g/h/i/j");

	const resolve = (req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, deep, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add(
		"deep-hierarchy: bare specifier from 10-deep dir (warm)",
		async () => {
			// 5 resolves per iteration so the body is long enough for tinybench
			// to get stable samples.
			for (let i = 0; i < 5; i++) {
				await resolve("top-dep");
			}
		},
	);

	bench.add("deep-hierarchy: relative from 10-deep dir (warm)", async () => {
		for (let i = 0; i < 5; i++) {
			await resolve("./leaf");
		}
	});
}
