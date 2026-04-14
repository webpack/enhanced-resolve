/*
 * self-reference
 *
 * Exercises the SelfReferencePlugin: a package can import itself by its
 * own package name, which must match the `name` in its own package.json
 * and go through the exports field. This lives on the `raw-module` hook
 * and adds work to every bare specifier attempt.
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
		conditionNames: ["node", "require"],
	});

	const from = path.join(fixtureDir, "src");

	const requests = [
		"self-ref-pkg",
		"self-ref-pkg/utils",
		"self-ref-pkg/features/one",
		"self-ref-pkg/features/two",
		"self-ref-pkg/features/three",
		"self-ref-pkg/features/four",
	];

	const resolve = (req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, from, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add("self-reference: import own package name (warm)", async () => {
		for (const req of requests) {
			await resolve(req);
		}
	});
}
