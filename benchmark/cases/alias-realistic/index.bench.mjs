/*
 * alias-realistic
 *
 * Webpack/TS-style path aliases (e.g. `@/components/Button`, `@utils/format`).
 * Exercises AliasPlugin with a realistic number of entries (not the 50-deep
 * chain that `pathological-deep-stack` measures) and a mix of matching and
 * non-matching prefixes so every request walks the alias list.
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

	const aliases = [
		{ name: "@", alias: path.join(fixtureDir, "src") },
		{ name: "@components", alias: path.join(fixtureDir, "src/components") },
		{ name: "@utils", alias: path.join(fixtureDir, "src/utils") },
		{ name: "@lib", alias: path.join(fixtureDir, "src/lib") },
		{ name: "~", alias: path.join(fixtureDir, "src") },
	];

	const resolver = ResolverFactory.createResolver({
		fileSystem,
		extensions: [".js", ".json"],
		alias: aliases,
	});

	const from = path.join(fixtureDir, "src");

	const requests = [
		"@/components/Button",
		"@/components/Input",
		"@/utils/format",
		"@/utils/parse",
		"@/lib/api",
		"@/lib/store",
		"@components/Button",
		"@components/Input",
		"@utils/format",
		"@utils/parse",
		"@lib/api",
		"@lib/store",
		"~/components/Button",
		"~/utils/parse",
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
		"alias-realistic: @/path + @components aliases (warm)",
		async () => {
			for (const req of requests) {
				await resolve(req);
			}
		},
	);
}
