# Benchmarks

Performance benchmarks for `enhanced-resolve`, tracked over time via
[CodSpeed](https://codspeed.io/).

Runner stack: [tinybench](https://github.com/tinylibs/tinybench) +
[`@codspeed/core`](https://www.npmjs.com/package/@codspeed/core) with a local
`withCodSpeed()` wrapper ported from webpack's
`test/BenchmarkTestCases.benchmark.mjs`. Locally it falls back to plain
tinybench wall-clock measurements, and under `CodSpeedHQ/action` in CI it
automatically switches to CodSpeed's instrumentation mode.

## Running locally

```sh
npm run benchmark
```

Optional substring filter to run only matching cases:

```sh
npm run benchmark -- realistic
BENCH_FILTER=pathological npm run benchmark
```

Locally the runner uses tinybench's wall-clock measurements and prints a
table of ops/s, mean, p99, and relative margin of error per task. Under CI,
the plugin detects the CodSpeed runner environment and switches to
instruction-counting mode automatically.

The V8 flags in `package.json` (`--no-opt --predictable --hash-seed=1` etc.)
are required by CodSpeed's instrumentation mode for deterministic results —
do not drop them.

### Optional: running real instruction counts locally

If you want to reproduce CI's exact instrument-count numbers on your own
machine (Linux only — the underlying Valgrind tooling has no macOS backend),
install the standalone CodSpeed CLI and wrap `npm run benchmark` with it:

```sh
curl -fsSL https://codspeed.io/install.sh | bash
codspeed run npm run benchmark
```

This is only useful if you want to debug an instruction-count regression
outside CI. Day-to-day benchmark iteration should use `npm run benchmark`
directly (wall-clock mode).

## Layout

```
benchmark/
├── run.mjs                     # entry point: discovers cases, runs bench
└── cases/
    └── <case-name>/
        ├── index.bench.mjs     # default export: register(bench, ctx)
        └── fixture/            # optional: project tree to resolve against
```

Each case directory must contain `index.bench.mjs` exporting a default
function with the signature:

```js
export default function register(bench, { caseName, caseDir, fixtureDir }) {
	bench.add("my case: descriptive name", async () => {
		// ... resolve calls ...
	});
}
```

`fixtureDir` is the absolute path to the case's `fixture/` subdirectory
(which may or may not exist). `caseDir` is the parent directory containing
`index.bench.mjs`.

## Existing cases

| Case                      | What it measures                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `realistic-midsize`       | Mixed batch of relative/bare/scoped/exports/nested-`node_modules` requests against a synthetic mid-size tree |
| `pathological-deep-stack` | 50-deep alias chain, specifically stresses the `doResolve` recursion-check path                              |

Add new cases by creating a new directory under `cases/` — `run.mjs` will
pick it up automatically on the next run.

## Adding a CodSpeed-friendly case

A few rules of thumb:

1. **Keep each bench body long enough to be measurable** (batch many resolves
   per iteration). CodSpeed's simulation mode runs the body exactly once under
   instrumentation, so a body that does one `resolver.resolve()` will be
   dominated by instrumentation overhead.
2. **Avoid randomness.** Fixed request lists, fixed seeds. CodSpeed compares
   against the base commit and expects identical work across runs.
3. **Pre-build anything expensive (resolvers, alias lists, fixture paths) outside
   the `bench.add` callback.** The goal is to measure resolve, not setup.
4. **Prefer one focused case per bench file**, so the PR report is easy to
   read.

## CI integration

CI is driven by `.github/workflows/benchmarks.yml`, which uses
`CodSpeedHQ/action@v4` in `mode: "simulation"` and authenticates via the
`CODSPEED_TOKEN` repo secret.

Both `CODSPEED_TOKEN` and CodSpeed repo enablement must be configured by a
repo admin once — see the top-level PR description for the handoff.
