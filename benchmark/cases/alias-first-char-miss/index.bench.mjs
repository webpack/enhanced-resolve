/*
 * alias-first-char-miss
 *
 * Stresses the char-code screen in `AliasUtils.aliasResolveHandler`. The
 * alias list is populated with entries whose names begin with first
 * characters the request never starts with. A naive implementation
 * walks each option calling `innerRequest.startsWith(nameWithSlash)` —
 * this case makes that walk as cheap as possible by letting the compiled
 * `firstCharCode` screen reject every option on a single integer compare.
 *
 * Companion to `huge-alias-list` / `huge-alias-miss`: those cases share a
 * first char across the whole list, so they still need the full
 * `startsWith` check. Here the full `startsWith` path never runs for the
 * misses, and the real work is one matching `@scope/pkg` entry at the
 * tail.
 */

import fs from "fs";
import path from "path";
import enhanced from "../../../lib/index.js";

const { ResolverFactory, CachedInputFileSystem } = enhanced;

const PARALLEL_ALIASES = 300;

/**
 * @param {import("tinybench").Bench} bench bench
 * @param {{ fixtureDir: string }} ctx ctx
 */
export default function register(bench, { fixtureDir }) {
	const fileSystem = new CachedInputFileSystem(fs, 4000);

	const aliases = [];
	// Generate alias names across many leading characters so that any single
	// request only matches the first-char bucket for a small fraction of the
	// list. The char-code screen short-circuits the other ~99%.
	const letters = "abcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < PARALLEL_ALIASES; i++) {
		const char = letters[i % letters.length];
		aliases.push({
			name: `${char}-unused-${i}`,
			alias: path.join(fixtureDir, "src/target/a.js"),
		});
	}
	// Tail entries that actually match — they start with `@` so they only
	// appear after the linear scan has rejected every `a-*` … `9-*` entry via
	// the char-code screen.
	for (const file of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
		aliases.push({
			name: `@tail/${file}`,
			alias: path.join(fixtureDir, `src/target/${file}.js`),
		});
	}

	const resolver = ResolverFactory.createResolver({
		fileSystem,
		extensions: [".js"],
		alias: aliases,
	});

	const from = path.join(fixtureDir, "src");

	// Requests whose first character (`@`) doesn't match any of the 300
	// non-matching alias names. This is the shape of a typical webpack
	// config with scoped-package aliases mixed in with many legacy aliases.
	const requests = [
		"@tail/a",
		"@tail/b",
		"@tail/c",
		"@tail/d",
		"@tail/e",
		"@tail/f",
		"@tail/g",
		"@tail/h",
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
		`alias-first-char-miss: ${PARALLEL_ALIASES} aliases, scoped tail matches`,
		async () => {
			for (const req of requests) {
				await resolve(req);
			}
		},
	);
}
