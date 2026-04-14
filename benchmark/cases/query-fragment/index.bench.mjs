/*
 * query-fragment
 *
 * Webpack loaders attach `?query` and `#fragment` to requests (for e.g.
 * `import x from "./foo.vue?vue&type=style"`), and the ParsePlugin has
 * to split these apart before kicking off resolution, then reattach them
 * to the final result. This case fires requests that exercise all four
 * combinations (plain, ?query, #fragment, ?query#fragment) so the parser
 * split/join path is hot.
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

	const from = path.join(fixtureDir, "src");

	const requests = [
		"./style",
		"./style?scoped",
		"./style#fragment",
		"./style?mode=dev#legacy",
		"./component",
		"./component?lang=ts",
		"./component#name",
		"./util?k=1&v=2",
		"./util?x=1#y",
	];

	const resolve = (req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, from, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add("query-fragment: ?query + #fragment mix (warm)", async () => {
		for (const req of requests) {
			await resolve(req);
		}
	});
}
