/*
 * large-alias-list
 *
 * Unlike `alias-realistic` (5 aliases) and `pathological-deep-stack` (50
 * aliases forming a chain), this case configures 50 parallel aliases where
 * most don't match the current request. Measures the cost of AliasPlugin's
 * linear scan through unmatched entries — the common shape for projects
 * with a lot of alias rewrites in their webpack config.
 */

import fs from "fs";
import path from "path";
import enhanced from "../../../lib/index.js";

const { ResolverFactory, CachedInputFileSystem } = enhanced;

const PARALLEL_ALIASES = 50;

/**
 * @param {import('tinybench').Bench} bench
 * @param {{ fixtureDir: string }} ctx
 */
export default function register(bench, { fixtureDir }) {
	const fileSystem = new CachedInputFileSystem(fs, 4000);

	// 50 non-matching aliases + a handful that actually resolve. Every
	// request has to walk through the full list because AliasPlugin stops
	// on the first match.
	const aliases = [];
	for (let i = 0; i < PARALLEL_ALIASES; i++) {
		aliases.push({
			name: `unused-alias-${i}`,
			alias: path.join(fixtureDir, "src/target/a.js"),
		});
	}
	for (const f of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
		aliases.push({
			name: `t-${f}`,
			alias: path.join(fixtureDir, `src/target/${f}.js`),
		});
	}

	const resolver = ResolverFactory.createResolver({
		fileSystem,
		extensions: [".js"],
		alias: aliases,
	});

	const from = path.join(fixtureDir, "src");

	// Requests that hit aliases at the end of the list (after the 50
	// non-matching ones) so each resolve walks the whole array.
	const requests = ["t-a", "t-b", "t-c", "t-d", "t-e", "t-f", "t-g", "t-h"];

	const resolve = (req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, from, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add(
		`large-alias-list: ${PARALLEL_ALIASES}+8 aliases, match near end`,
		async () => {
			for (const req of requests) {
				await resolve(req);
			}
		},
	);
}
