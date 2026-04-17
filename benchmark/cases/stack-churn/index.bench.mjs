/*
 * stack-churn
 *
 * Measures the allocation pressure of `doResolve`'s recursion-tracking
 * stack across many moderately-deep alias rewrites.
 *
 * Every level of alias rewriting re-enters the resolver pipeline via
 * `doResolve`, which has to extend the stack used to detect cycles.
 * On the `Set<string>`-clone baseline this means `new Set(parent)` per
 * level — a fresh hash-table allocation and an O(n) copy on every hook
 * re-entry. Under a long-running async workload the resulting GC churn
 * is what actually shows up in the numbers (look at p99 / rme when
 * running this case: the Set-clone baseline has markedly higher
 * variance from GC pauses).
 *
 * Unlike `pathological-deep-stack` (one very long chain), this case
 * fans out across several independent chains so the stacks don't all
 * share a common long prefix — closer in shape to large real-world
 * alias configs where the resolver sees many unrelated but non-trivial
 * stacks.
 */

import fs from "fs";
import enhanced from "../../../lib/index.js";

const { ResolverFactory, CachedInputFileSystem } = enhanced;

const CHAIN_COUNT = 4;
const CHAIN_DEPTH = 60;
const RESOLVES_PER_ITER = 20;

/**
 * Build CHAIN_COUNT independent alias chains, each of length CHAIN_DEPTH:
 *   c0-0 -> c0-1 -> ... -> c0-(n-1) -> ./target
 *   c1-0 -> c1-1 -> ... -> c1-(n-1) -> ./target
 *   ...
 * so every top-level resolve forces CHAIN_DEPTH `doResolve` re-entries.
 * @returns {Array<{name: string, alias: string}>} alias list
 */
function buildChains() {
	const aliases = [];
	for (let c = 0; c < CHAIN_COUNT; c++) {
		for (let i = 0; i < CHAIN_DEPTH - 1; i++) {
			aliases.push({ name: `c${c}-${i}`, alias: `c${c}-${i + 1}` });
		}
		aliases.push({ name: `c${c}-${CHAIN_DEPTH - 1}`, alias: "./target" });
	}
	return aliases;
}

/**
 * @param {import('tinybench').Bench} bench
 * @param {{ fixtureDir: string }} ctx
 */
export default function register(bench, { fixtureDir }) {
	const fileSystem = new CachedInputFileSystem(fs, 4000);
	const aliases = buildChains();

	const resolver = ResolverFactory.createResolver({
		fileSystem,
		extensions: [".js"],
		alias: aliases,
	});

	// Fixed request list (no randomness — CodSpeed requires deterministic work).
	const requests = [];
	for (let i = 0; i < RESOLVES_PER_ITER; i++) {
		requests.push(`c${i % CHAIN_COUNT}-0`);
	}

	const resolve = (req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, fixtureDir, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add(
		`stack-churn: ${CHAIN_COUNT}x${CHAIN_DEPTH} alias chains, ${RESOLVES_PER_ITER} resolves`,
		async () => {
			for (const req of requests) {
				await resolve(req);
			}
		},
	);
}
