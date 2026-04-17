/*
 * huge-alias-list
 *
 * Scales `large-alias-list` up to the PR-438 territory: projects with several
 * hundred alias entries in the webpack config (monorepos, generated aliases
 * from a workspace graph, etc.). Every resolve has to linearly walk the full
 * alias list, so this case is particularly sensitive to per-option work
 * (string concat, split, closure creation) inside AliasPlugin's scan.
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

	// Requests match aliases positioned at the tail of the list so every
	// resolve walks the full 300-entry array before finding a hit.
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
		`huge-alias-list: ${PARALLEL_ALIASES}+8 aliases, match near end`,
		async () => {
			for (const req of requests) {
				await resolve(req);
			}
		},
	);
}
