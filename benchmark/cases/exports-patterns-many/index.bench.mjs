/*
 * exports-patterns-many
 *
 * Targets the ExportsFieldPlugin's pattern-matching path specifically:
 * a package with 6 wildcard subpaths (`./ui/*`, `./data/*`, ...) and a
 * batch of requests that hit different prefixes. Each resolve has to
 * evaluate subpath patterns from longest-prefix-first, so this case
 * stresses that lookup and is a good sentinel for regressions in the
 * exports-field pattern matcher.
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

	const from = fixtureDir;

	const prefixes = ["ui", "data", "forms", "charts", "layout", "hooks"];
	const leaves = ["alpha", "beta", "gamma", "delta"];
	/** @type {string[]} */
	const requests = [];
	for (const p of prefixes) {
		for (const l of leaves) {
			requests.push(`many-patterns/${p}/${l}`);
		}
	}

	const resolve = (req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, from, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add("exports-patterns-many: 6 prefixes x 4 leaves (warm)", async () => {
		for (const req of requests) {
			await resolve(req);
		}
	});
}
