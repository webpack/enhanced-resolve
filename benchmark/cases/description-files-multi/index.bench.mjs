/*
 * description-files-multi
 *
 * `descriptionFiles` configured to include bower.json and component.json
 * alongside package.json. Every package directory lookup has to read each
 * candidate in order, so projects that opt into alternative description
 * files pay an extra cost per resolve. This case measures that cost on a
 * mix of packages that advertise themselves via different description
 * files.
 */

import fs from "fs";
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
		descriptionFiles: ["package.json", "bower.json", "component.json"],
	});

	const requests = ["pkg-a", "pkg-b", "pkg-c"];

	const resolve = (req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, fixtureDir, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add(
		"description-files-multi: package.json + bower + component (warm)",
		async () => {
			for (const req of requests) {
				await resolve(req);
			}
		},
	);
}
