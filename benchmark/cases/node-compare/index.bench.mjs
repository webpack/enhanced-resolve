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
 *   - Same 10000-entry request list (cycled from a fixed 30-entry pool)
 *   - Same starting directory
 *
 * Two request pools are used:
 *   - CJS pool: no-extension relative requests (`./fileNN`) that rely on
 *     automatic `.js` extension probing — used for `require.resolve`, the
 *     enhanced-resolve callback / promise / sync tasks.
 *   - ESM pool: explicit `./fileNN.js` specifiers — ESM resolution
 *     (including `import.meta.resolve`) does NOT probe extensions, so the
 *     specifiers must be fully qualified. Used for the `import.meta.resolve`
 *     task. enhanced-resolve handles both pools identically; the pools
 *     differ only because Node's ESM resolver is stricter.
 *
 * Node's `require.resolve` keeps a process-global path cache on the Module
 * class, so it stays warm across tinybench iterations. To keep the
 * comparison fair, the enhanced-resolve tasks reuse a long-lived
 * `CachedInputFileSystem` (30s TTL) across iterations — nothing is
 * rebuilt per-iteration. An additional variant with `unsafeCache: true`
 * is included, which is the closest enhanced-resolve analogue to Node's
 * per-specifier memoization.
 *
 * The fixture is generated at registration time (20 tiny CJS packages in
 * node_modules + 10 relative source files + one ESM helper used to get a
 * bound `import.meta.resolve`) and gitignored — no fixture files are
 * committed.
 */

import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { pathToFileURL } from "url";
import enhanced from "../../../lib/index.js";

const { ResolverFactory, CachedInputFileSystem } = enhanced;

const PKG_COUNT = 20;
const FILE_COUNT = 10;
const BATCH_SIZE = 10000;

/**
 * Build a deterministic fixture tree on disk. Idempotent: re-running the
 * bench does not re-create files whose contents haven't changed in shape,
 * but writing 50 tiny files is fast enough that we don't bother short-
 * circuiting.
 *
 * Layout:
 *   fixture/
 *     package.json                       // type: commonjs
 *     src/index.js, src/file00..file09.js
 *     node_modules/pkg00..pkg19/
 *       package.json  // main: ./index.js
 *       index.js
 *
 * Every bare specifier `pkgNN` and relative specifier `./fileNN` used
 * in the bench resolves in both Node and enhanced-resolve.
 */
function ensureFixture(fixtureDir) {
	fs.mkdirSync(fixtureDir, { recursive: true });
	fs.writeFileSync(
		path.join(fixtureDir, "package.json"),
		JSON.stringify({
			name: "node-compare-fixture",
			version: "1.0.0",
			type: "commonjs",
			main: "./src/index.js",
		}),
	);

	const srcDir = path.join(fixtureDir, "src");
	fs.mkdirSync(srcDir, { recursive: true });
	fs.writeFileSync(path.join(srcDir, "index.js"), "module.exports = {};\n");
	for (let i = 0; i < FILE_COUNT; i++) {
		const name = `file${String(i).padStart(2, "0")}`;
		fs.writeFileSync(
			path.join(srcDir, `${name}.js`),
			`module.exports = ${i};\n`,
		);
	}
	// ESM helper: `import.meta.resolve` is a bound method that closes over
	// its owning module's URL, so we need a module that actually lives in
	// the fixture tree. Exporting the bound function lets the bench body
	// call it and have relative + bare specifiers resolved against this
	// module's location.
	fs.writeFileSync(
		path.join(srcDir, "resolver.mjs"),
		"export const resolve = import.meta.resolve;\n",
	);

	const nmDir = path.join(fixtureDir, "node_modules");
	fs.mkdirSync(nmDir, { recursive: true });
	for (let i = 0; i < PKG_COUNT; i++) {
		const name = `pkg${String(i).padStart(2, "0")}`;
		const pkgDir = path.join(nmDir, name);
		fs.mkdirSync(pkgDir, { recursive: true });
		fs.writeFileSync(
			path.join(pkgDir, "package.json"),
			JSON.stringify({ name, version: "1.0.0", main: "./index.js" }),
		);
		fs.writeFileSync(
			path.join(pkgDir, "index.js"),
			`module.exports = ${JSON.stringify(name)};\n`,
		);
	}
}

/**
 * @param {import('tinybench').Bench} bench
 * @param {{ fixtureDir: string }} ctx
 */
export default async function register(bench, { fixtureDir }) {
	ensureFixture(fixtureDir);
	const srcDir = path.join(fixtureDir, "src");

	// 30-entry pool: 20 bare specifiers into node_modules + 10 relative
	// requests. Every entry must resolve in *both* Node's CJS resolver and
	// enhanced-resolve, or the bench body (which runs under `throws: true`)
	// will bail. Uses relative paths without a file extension so the resolver's
	// automatic `.js` probing is exercised — matches the default CJS lookup.
	const pool = [];
	for (let i = 0; i < PKG_COUNT; i++) {
		pool.push(`pkg${String(i).padStart(2, "0")}`);
	}
	for (let i = 0; i < FILE_COUNT; i++) {
		pool.push(`./file${String(i).padStart(2, "0")}`);
	}

	// Expand to exactly BATCH_SIZE requests by cycling through the pool.
	// Deterministic (no randomness) so CodSpeed comparisons are stable.
	const requests = new Array(BATCH_SIZE);
	for (let i = 0; i < BATCH_SIZE; i++) {
		requests[i] = pool[i % pool.length];
	}

	// Parallel ESM-compatible pool with explicit `.js` extensions. Node's
	// ESM resolution (and `import.meta.resolve`) does not probe extensions,
	// so bench inputs for the ESM task must be fully qualified. Bare
	// specifiers resolve identically in both modes.
	const esmPool = [];
	for (let i = 0; i < PKG_COUNT; i++) {
		esmPool.push(`pkg${String(i).padStart(2, "0")}`);
	}
	for (let i = 0; i < FILE_COUNT; i++) {
		esmPool.push(`./file${String(i).padStart(2, "0")}.js`);
	}
	const esmRequests = new Array(BATCH_SIZE);
	for (let i = 0; i < BATCH_SIZE; i++) {
		esmRequests[i] = esmPool[i % esmPool.length];
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
	// that cache entries never expire during a bench run (see the note in
	// realistic-midsize).
	const fileSystem = new CachedInputFileSystem(fs, 30 * 1000);

	const commonOptions = {
		fileSystem,
		extensions: [".js"],
		conditionNames: ["node", "require"],
		mainFields: ["main"],
	};

	const asyncResolver = ResolverFactory.createResolver(commonOptions);
	const asyncResolverUnsafe = ResolverFactory.createResolver({
		...commonOptions,
		unsafeCache: true,
	});
	const syncResolver = ResolverFactory.createResolver({
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
		`node-compare: enhanced-resolve async x ${BATCH_SIZE} (fs cache)`,
		async () => {
			for (let i = 0; i < requests.length; i++) {
				await resolveAsync(asyncResolver, requests[i]);
			}
		},
	);

	bench.add(
		`node-compare: enhanced-resolve async x ${BATCH_SIZE} (fs + unsafeCache)`,
		async () => {
			for (let i = 0; i < requests.length; i++) {
				await resolveAsync(asyncResolverUnsafe, requests[i]);
			}
		},
	);

	// Promise API (resolver.resolvePromise). Functionally equivalent to the
	// callback-based async task wrapped in a new Promise — benching it
	// separately shows the overhead (or lack thereof) of the built-in
	// promise wrapper versus a manual one.
	bench.add(
		`node-compare: enhanced-resolve promise x ${BATCH_SIZE} (fs + unsafeCache)`,
		async () => {
			for (let i = 0; i < requests.length; i++) {
				const r = await asyncResolverUnsafe.resolvePromise(
					{},
					srcDir,
					requests[i],
				);
				if (!r) throw new Error(`no result for ${requests[i]}`);
			}
		},
	);

	bench.add(
		`node-compare: enhanced-resolve sync x ${BATCH_SIZE} (fs + unsafeCache)`,
		() => {
			for (let i = 0; i < requests.length; i++) {
				const r = syncResolver.resolveSync({}, srcDir, requests[i]);
				if (!r) throw new Error(`no result for ${requests[i]}`);
			}
		},
	);

	bench.add(`node-compare: node require.resolve x ${BATCH_SIZE}`, () => {
		for (let i = 0; i < requests.length; i++) {
			requireAnchor.resolve(requests[i]);
		}
	});

	// `import.meta.resolve` is sync in modern Node (>= 20.6 / 18.19) and
	// does its own internal caching via the ESM loader. Uses `esmRequests`
	// because ESM resolution requires explicit file extensions.
	bench.add(`node-compare: node import.meta.resolve x ${BATCH_SIZE}`, () => {
		for (let i = 0; i < esmRequests.length; i++) {
			importMetaResolve(esmRequests[i]);
		}
	});
}
