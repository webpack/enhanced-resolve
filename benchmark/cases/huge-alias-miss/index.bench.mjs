/*
 * huge-alias-miss
 *
 * Companion to `huge-alias-list` for the other common shape in big configs:
 * plain relative requests that do NOT match any alias entry. AliasPlugin
 * still walks the entire alias list before falling through, so the miss path
 * is the purest measurement of per-option overhead (the matching branch never
 * runs, no `doResolve` recursion).
 */

import fs from "fs";
import path from "path";
import enhanced from "../../../lib/index.js";

const { ResolverFactory, CachedInputFileSystem } = enhanced;

const PARALLEL_ALIASES = 300;

/**
 * @param {import('tinybench').Bench} bench
 * @param {{ fixtureDir: string }} ctx
 */
export default function register(bench, { fixtureDir }) {
	const fileSystem = new CachedInputFileSystem(fs, 4000);

	const aliases = [];
	for (let i = 0; i < PARALLEL_ALIASES; i++) {
		aliases.push({
			name: `unused-alias-${i}`,
			alias: path.join(fixtureDir, "src/target/a.js"),
		});
	}

	const resolver = ResolverFactory.createResolver({
		fileSystem,
		extensions: [".js"],
		alias: aliases,
	});

	const from = path.join(fixtureDir, "src");

	// Relative requests that never match any alias — the resolver walks the
	// full 300-entry list twice (once for `fallback`, once for `alias`) before
	// falling through to normal resolution.
	const requests = ["./index", "./target/a", "./target/b", "./target/c"];

	const resolve = (req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, from, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add(
		`huge-alias-miss: ${PARALLEL_ALIASES} aliases, no match`,
		async () => {
			for (const req of requests) {
				await resolve(req);
			}
		},
	);
}
