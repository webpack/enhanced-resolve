/*
 * pathological-deep-stack
 *
 * Stress the doResolve recursion-check path specifically. Configures a long
 * chain of alias rewrites so every resolution of `chain-0` produces a stack
 * of depth O(N) before landing on `./target.js`.
 *
 * This is the case that the linked-list rewrite in PR #443 is most likely
 * to regress, because hasStackEntry walks the parent chain. Keeping the
 * number here high enough to matter (50+ levels) but low enough to finish
 * quickly is the point.
 *
 * If you're benchmarking the #443 PR, compare this case before and after:
 *   - "before" (current main): Set<string> clone per level, O(n) cost per
 *     doResolve, O(n^2) per full chain, but cheap per-step comparison
 *   - "after" (#443): single linked-list node per level, O(1) alloc, but
 *     hasStackEntry walks parents -> O(n) per comparison, O(n^2) per chain
 * Both are quadratic on paper; the question is the constant factor and the
 * amount of GC pressure. That's exactly what this case measures.
 */

import fs from "fs";
import path from "path";
import enhanced from "../../../lib/index.js";

const { ResolverFactory, CachedInputFileSystem } = enhanced;

const CHAIN_LENGTH = 50;

/**
 * Build an AliasPlugin-compatible alias list that forms a chain:
 *   chain-0 -> chain-1 -> chain-2 -> ... -> chain-49 -> ./target
 *
 * Each entry rewrites one specifier to the next, so a single resolve of
 * `chain-0` forces enhanced-resolve to re-enter the pipeline CHAIN_LENGTH
 * times before bottoming out.
 */
function buildChainAliases() {
	const aliases = [];
	for (let i = 0; i < CHAIN_LENGTH - 1; i++) {
		aliases.push({ name: `chain-${i}`, alias: `chain-${i + 1}` });
	}
	aliases.push({ name: `chain-${CHAIN_LENGTH - 1}`, alias: "./target" });
	return aliases;
}

/**
 * @param {import('tinybench').Bench} bench
 * @param {{ fixtureDir: string }} ctx
 */
export default function register(bench, { fixtureDir }) {
	const fileSystem = new CachedInputFileSystem(fs, 4000);
	const aliases = buildChainAliases();

	const resolver = ResolverFactory.createResolver({
		fileSystem,
		extensions: [".js"],
		alias: aliases,
	});

	const resolve = () =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, fixtureDir, "chain-0", {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error("no result"));
				resolve(result);
			});
		});

	bench.add(
		`pathological-deep-stack: alias chain of ${CHAIN_LENGTH} (warm)`,
		async () => {
			// 10 resolves per iteration so the bench body is long enough to be
			// measurable but short enough to finish quickly.
			for (let i = 0; i < 10; i++) {
				await resolve();
			}
		},
	);
}
