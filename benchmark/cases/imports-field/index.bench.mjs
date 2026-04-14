/*
 * imports-field
 *
 * Exercises the ImportsFieldPlugin (package-internal `#` specifiers) with:
 *   - plain conditional imports (#utils, #config, #polyfill)
 *   - pattern imports (#features/*, #lib/*.js)
 *   - plain string mappings (#constant)
 *
 * Resolves `#...` requests from a source file inside the fixture, so the
 * resolver has to walk up to find package.json, then re-enter the imports
 * resolution pipeline.
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
		conditionNames: ["node", "require", "development"],
	});

	const from = path.join(fixtureDir, "src");

	const requests = [
		"#utils",
		"#config",
		"#constant",
		"#features/feat-a",
		"#features/feat-b",
		"#features/feat-c",
		"#lib/one.js",
		"#lib/two.js",
		"#lib/three.js",
	];

	const resolve = (req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, from, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add("imports-field: # specifiers (warm)", async () => {
		for (const req of requests) {
			await resolve(req);
		}
	});
}
