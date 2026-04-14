/*
 * deep-package-subpath
 *
 * A mix of `pkg/sub`, `pkg/sub/leaf`, and `pkg/deep/nested/leaf` requests
 * into a single package — the shape produced by libraries like lodash,
 * lodash/fp, rxjs/operators, or date-fns. No exports field; just plain
 * directory traversal after the package has been located, so this measures
 * the JoinRequestPartPlugin + relative-resolution pipeline after the
 * package boundary.
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

	const requests = [
		"lodash-like",
		"lodash-like/fp/flow",
		"lodash-like/fp/flatMap",
		"lodash-like/fp/pick",
		"lodash-like/fp/chunk",
		"lodash-like/fp/memoize",
		"lodash-like/fp/extras/pickBy",
		"lodash-like/fp/extras/omit",
		"lodash-like/fp/extras/defaults",
	];

	const resolve = (req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, from, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add("deep-package-subpath: pkg/a/b/c requests (warm)", async () => {
		for (const req of requests) {
			await resolve(req);
		}
	});
}
