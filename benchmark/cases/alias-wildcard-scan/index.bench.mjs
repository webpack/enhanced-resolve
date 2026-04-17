/*
 * alias-wildcard-scan
 *
 * Complements `large-alias-list` by pushing the per-item work done *inside*
 * the AliasPlugin scan loop, not just the loop length. Concretely: 100
 * parallel non-matching aliases plus one wildcard entry (`pkg-*`) and one
 * exact match at the tail. Every resolve walks the full list, and for each
 * item the handler has to decide "is this a wildcard alias?" — previously
 * that required `item.name.split("*")` on every pass, allocating an array
 * whose result was immediately thrown away for all non-wildcard items.
 *
 * This case specifically stresses that decision so a regression to the
 * wildcard-detection path shows up cleanly on CodSpeed, separately from the
 * fixture-IO cost exercised by `large-alias-list`.
 */

import fs from "fs";
import path from "path";
import enhanced from "../../../lib/index.js";

const { ResolverFactory, CachedInputFileSystem } = enhanced;

const NON_MATCHING_ALIASES = 100;

/**
 * @param {import('tinybench').Bench} bench
 * @param {{ fixtureDir: string }} ctx
 */
export default function register(bench, { fixtureDir }) {
	const fileSystem = new CachedInputFileSystem(fs, 4000);

	// 100 non-matching plain aliases, then one wildcard ("pkg-*"), then a
	// single plain exact-match ("t-end"). The wildcard sits in the middle
	// of the list so each resolve walks past non-wildcard items, through
	// the wildcard, and on to the matching tail entry.
	const aliases = [];
	for (let i = 0; i < NON_MATCHING_ALIASES; i++) {
		aliases.push({
			name: `unused-alias-${i}`,
			alias: path.join(fixtureDir, "src/target/a.js"),
		});
	}
	aliases.push({
		name: "pkg-*",
		alias: path.join(fixtureDir, "src/target/*.js"),
	});
	aliases.push({
		name: "t-end",
		alias: path.join(fixtureDir, "src/target/h.js"),
	});

	const resolver = ResolverFactory.createResolver({
		fileSystem,
		extensions: [".js"],
		alias: aliases,
	});

	const from = path.join(fixtureDir, "src");

	// Mix of wildcard hits (pkg-a / pkg-b / ...) and exact-match hits
	// (t-end). Each request walks the entire alias list once.
	const requests = [
		"pkg-a",
		"pkg-b",
		"pkg-c",
		"pkg-d",
		"pkg-e",
		"pkg-f",
		"pkg-g",
		"pkg-h",
		"t-end",
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
		`alias-wildcard-scan: ${NON_MATCHING_ALIASES}+1 wildcard + 1 exact`,
		async () => {
			for (const req of requests) {
				await resolve(req);
			}
		},
	);
}
