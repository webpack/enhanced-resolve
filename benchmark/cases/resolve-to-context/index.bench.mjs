/*
 * resolve-to-context
 *
 * `resolveToContext: true` asks the resolver to return a directory rather
 * than a file, which takes a different branch through ResolverFactory
 * (skips the file/extension/mainField/raw-file plugins entirely). This
 * case measures that alternate pipeline.
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
		resolveToContext: true,
	});

	const from = fixtureDir;

	const requests = [
		"./src/a",
		"./src/b",
		"./src/c",
		"./src",
		"./node_modules/some-pkg",
	];

	const resolve = (req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, from, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add("resolve-to-context: directory resolve (warm)", async () => {
		for (const req of requests) {
			await resolve(req);
		}
	});
}
