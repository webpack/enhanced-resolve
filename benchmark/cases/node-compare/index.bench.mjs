/*
 * node-compare
 *
 * Head-to-head comparison between enhanced-resolve and Node.js's built-in
 * resolvers (CJS `require.resolve` via `createRequire`, ESM
 * `import.meta.resolve`) over a large, fixed request list (10000 resolves
 * per iteration). This is the case people most often ask about when
 * deciding whether enhanced-resolve's feature set is "worth it" over the
 * built-in resolvers — so it lives as its own bench for easy
 * cross-reference.
 *
 * Everything is held equal across tasks:
 *   - Same fixture tree
 *   - Same 10000-entry request list (one entry per unique target, see below)
 *   - Same starting directory
 *
 * The enhanced-resolve side is benched in two variants per API flavour:
 *   - without `unsafeCache` — measures the real cost of walking the
 *     plugin pipeline on every call
 *   - with `unsafeCache: true` — the closest analogue to Node's
 *     per-specifier memoization (Module._pathCache for CJS, the ESM
 *     loader cache for `import.meta.resolve`)
 *
 * The request list is *unique-per-entry* — every specifier in the 10000-
 * request batch points at a distinct resolvable target. This defeats the
 * per-specifier result caches within a single batch, so even with
 * `unsafeCache` on the first pass through the list must run the full
 * resolver pipeline for every entry. Subsequent tinybench iterations
 * replay the list, at which point Node's internal caches and
 * enhanced-resolve's `unsafeCache` do start hitting — which is exactly
 * what the cached variants are there to illustrate.
 *
 * `CachedInputFileSystem` is retained on every enhanced-resolve task
 * because it mirrors the OS-level fs cache Node itself benefits from
 * (stat / readdir / readJson memoized in memory); it does NOT cache the
 * specifier → path mapping, so it cannot short-circuit a fresh
 * specifier.
 *
 * Cross-iteration caching is unavoidable: tinybench replays the same
 * request list across 2 warmup + 10 measurement iterations, and the
 * first run through populates Node's internal caches for the whole
 * list. Read the numbers as "steady-state warm, cache cannot help"
 * rather than truly cold.
 *
 * Pool composition (all 10000 entries unique, ESM-compatible so they
 * resolve in every task):
 *   - 5000 bare specifiers into a single package with wildcard subpath
 *     exports (`megapkg/fileNNNN` → `megapkg/lib/fileNNNN.js`). A single
 *     package with wildcard exports keeps the fixture size small while
 *     still exercising the `exports` field / `node_modules` lookup path.
 *   - 5000 relative specifiers with explicit `.js` extensions (`./fileNNNN.js`)
 *     so Node's ESM resolver accepts them; enhanced-resolve is happy with
 *     them too.
 *
 * The fixture is generated at registration time (one `megapkg` with 5000
 * lib files + 5000 src files + one ESM helper for the bound
 * `import.meta.resolve`) and gitignored. A sentinel file skips
 * regeneration when counts haven't changed, so only the first run pays
 * the setup cost.
 */

import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { pathToFileURL } from "url";
import enhanced from "../../../lib/index.js";

const { ResolverFactory, CachedInputFileSystem } = enhanced;

const PKG_SUBPATH_COUNT = 5000;
const FILE_COUNT = 5000;
const BATCH_SIZE = PKG_SUBPATH_COUNT + FILE_COUNT;

/**
 * Build a deterministic fixture tree on disk. Skipped entirely when a
 * sentinel file records that the current (PKG_SUBPATH_COUNT, FILE_COUNT)
 * combination has already been materialized — creating 10k tiny files is
 * a ~5s cost we don't want to pay every `npm run benchmark`.
 *
 * Layout:
 *   fixture/
 *     package.json                          // type: commonjs
 *     src/
 *       resolver.mjs                        // exports `import.meta.resolve`
 *       file0000.js .. file4999.js          // relative-resolve targets
 *     node_modules/megapkg/
 *       package.json                        // wildcard subpath exports
 *       lib/
 *         file0000.js .. file4999.js        // bare-specifier targets
 */
function ensureFixture(fixtureDir) {
	const sentinel = path.join(fixtureDir, ".ok");
	const expected = `${PKG_SUBPATH_COUNT}:${FILE_COUNT}`;
	try {
		if (fs.readFileSync(sentinel, "utf8") === expected) return;
	} catch {
		// sentinel missing or unreadable — regenerate
	}

	fs.mkdirSync(fixtureDir, { recursive: true });
	fs.writeFileSync(
		path.join(fixtureDir, "package.json"),
		JSON.stringify({
			name: "node-compare-fixture",
			version: "1.0.0",
			type: "commonjs",
		}),
	);

	const srcDir = path.join(fixtureDir, "src");
	fs.mkdirSync(srcDir, { recursive: true });
	// ESM helper: `import.meta.resolve` is a bound method that closes over
	// its owning module's URL, so we need a module that actually lives in
	// the fixture tree. Exporting the bound function lets the bench body
	// call it and have relative + bare specifiers resolved against this
	// module's location.
	fs.writeFileSync(
		path.join(srcDir, "resolver.mjs"),
		"export const resolve = import.meta.resolve;\n",
	);
	for (let i = 0; i < FILE_COUNT; i++) {
		const name = `file${String(i).padStart(4, "0")}`;
		fs.writeFileSync(
			path.join(srcDir, `${name}.js`),
			`module.exports = ${i};\n`,
		);
	}

	const megapkgDir = path.join(fixtureDir, "node_modules", "megapkg");
	const megapkgLibDir = path.join(megapkgDir, "lib");
	fs.mkdirSync(megapkgLibDir, { recursive: true });
	// Wildcard subpath exports: `megapkg/fileNNNN` → `./lib/fileNNNN.js`.
	// Supported by both Node's CJS + ESM resolvers and enhanced-resolve.
	fs.writeFileSync(
		path.join(megapkgDir, "package.json"),
		JSON.stringify({
			name: "megapkg",
			version: "1.0.0",
			exports: {
				"./*": "./lib/*.js",
			},
		}),
	);
	for (let i = 0; i < PKG_SUBPATH_COUNT; i++) {
		const name = `file${String(i).padStart(4, "0")}`;
		fs.writeFileSync(
			path.join(megapkgLibDir, `${name}.js`),
			`module.exports = ${JSON.stringify(name)};\n`,
		);
	}

	fs.writeFileSync(sentinel, expected);
}

/**
 * @param {import('tinybench').Bench} bench
 * @param {{ fixtureDir: string }} ctx
 */
export default async function register(bench, { fixtureDir }) {
	ensureFixture(fixtureDir);
	const srcDir = path.join(fixtureDir, "src");

	// Build the 10000-entry request list. All specifiers are unique so the
	// per-specifier result caches in Node's CJS and ESM resolvers (and
	// enhanced-resolve's `unsafeCache` if we'd enabled it) cannot
	// short-circuit anything within a single batch.
	const requests = new Array(BATCH_SIZE);
	for (let i = 0; i < PKG_SUBPATH_COUNT; i++) {
		requests[i] = `megapkg/file${String(i).padStart(4, "0")}`;
	}
	for (let i = 0; i < FILE_COUNT; i++) {
		requests[PKG_SUBPATH_COUNT + i] = `./file${String(i).padStart(4, "0")}.js`;
	}

	// Node's `require.resolve` is anchored to a real file inside `src/` so
	// relative specifiers resolve against that directory, and bare
	// specifiers walk up the `node_modules` lookup chain.
	const requireAnchor = createRequire(path.join(srcDir, "index.js"));

	// `import.meta.resolve` is bound to its module's URL, so import the
	// helper we wrote into `fixture/src/resolver.mjs` and use its exported
	// `resolve`. Relative specifiers will resolve against `fixture/src/`,
	// matching the CJS anchor above.
	const { resolve: importMetaResolve } = await import(
		pathToFileURL(path.join(srcDir, "resolver.mjs")).href
	);

	// Shared fs cache across enhanced-resolve tasks. 30s TTL is long enough
	// that stat / readdir entries never expire during a bench run.
	const fileSystem = new CachedInputFileSystem(fs, 30 * 1000);

	const commonOptions = {
		fileSystem,
		extensions: [".js"],
		conditionNames: ["node", "require", "import"],
		mainFields: ["main"],
	};

	// Two parallel resolver setups per API flavour: one without
	// `unsafeCache` (real pipeline work every call), one with it (result
	// memoization on second+ iteration).
	const asyncResolver = ResolverFactory.createResolver(commonOptions);
	const asyncResolverCached = ResolverFactory.createResolver({
		...commonOptions,
		unsafeCache: true,
	});
	const syncResolver = ResolverFactory.createResolver({
		...commonOptions,
		useSyncFileSystemCalls: true,
	});
	const syncResolverCached = ResolverFactory.createResolver({
		...commonOptions,
		useSyncFileSystemCalls: true,
		unsafeCache: true,
	});

	const resolveAsync = (resolver, req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, srcDir, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add(
		`node-compare: enhanced-resolve async x ${BATCH_SIZE}`,
		async () => {
			for (let i = 0; i < requests.length; i++) {
				await resolveAsync(asyncResolver, requests[i]);
			}
		},
	);

	bench.add(
		`node-compare: enhanced-resolve async x ${BATCH_SIZE} (unsafeCache)`,
		async () => {
			for (let i = 0; i < requests.length; i++) {
				await resolveAsync(asyncResolverCached, requests[i]);
			}
		},
	);

	// Promise API (resolver.resolvePromise). Functionally equivalent to the
	// callback-based async task wrapped in a new Promise — benching it
	// separately shows the overhead (or lack thereof) of the built-in
	// promise wrapper versus a manual one.
	bench.add(
		`node-compare: enhanced-resolve promise x ${BATCH_SIZE}`,
		async () => {
			for (let i = 0; i < requests.length; i++) {
				const r = await asyncResolver.resolvePromise({}, srcDir, requests[i]);
				if (!r) throw new Error(`no result for ${requests[i]}`);
			}
		},
	);

	bench.add(
		`node-compare: enhanced-resolve promise x ${BATCH_SIZE} (unsafeCache)`,
		async () => {
			for (let i = 0; i < requests.length; i++) {
				const r = await asyncResolverCached.resolvePromise(
					{},
					srcDir,
					requests[i],
				);
				if (!r) throw new Error(`no result for ${requests[i]}`);
			}
		},
	);

	bench.add(`node-compare: enhanced-resolve sync x ${BATCH_SIZE}`, () => {
		for (let i = 0; i < requests.length; i++) {
			const r = syncResolver.resolveSync({}, srcDir, requests[i]);
			if (!r) throw new Error(`no result for ${requests[i]}`);
		}
	});

	bench.add(
		`node-compare: enhanced-resolve sync x ${BATCH_SIZE} (unsafeCache)`,
		() => {
			for (let i = 0; i < requests.length; i++) {
				const r = syncResolverCached.resolveSync({}, srcDir, requests[i]);
				if (!r) throw new Error(`no result for ${requests[i]}`);
			}
		},
	);

	bench.add(`node-compare: node require.resolve x ${BATCH_SIZE}`, () => {
		for (let i = 0; i < requests.length; i++) {
			requireAnchor.resolve(requests[i]);
		}
	});

	// `import.meta.resolve` is sync in modern Node (>= 20.6 / 18.19). The
	// ESM loader keeps its own specifier cache; using unique specifiers
	// (see comment on `requests` above) keeps that cache from hiding the
	// real resolve cost on every call within a batch.
	bench.add(`node-compare: node import.meta.resolve x ${BATCH_SIZE}`, () => {
		for (let i = 0; i < requests.length; i++) {
			importMetaResolve(requests[i]);
		}
	});
}
