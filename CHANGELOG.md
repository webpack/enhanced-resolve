# enhanced-resolve

## 5.21.0

### Minor Changes

- Added promise API and support to resolve without `context` and `resolveContext`. (by [@alexander-akait](https://github.com/alexander-akait) in [#520](https://github.com/webpack/enhanced-resolve/pull/520))

### Patch Changes

- fix: prevent fallback to parent node_modules when exports field target file is not found (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#495](https://github.com/webpack/enhanced-resolve/pull/495))

  When a package has an `exports` field that maps a request to a target file,
  but that target file does not exist on disk, enhanced-resolve was incorrectly
  falling back to search parent `node_modules` directories. This violated the
  Node.js ESM resolution spec, which requires resolution to fail with an error
  rather than continue searching up the directory tree.

  This manifested in monorepos where the same package exists at multiple levels
  (e.g. `workspace/node_modules/pkg` and `root/node_modules/pkg`): if the
  workspace version's exports-mapped target was missing, the resolver would
  silently resolve to the root version instead.

  Root cause: `ExportsFieldPlugin` was returning `null` on failure, which
  `Resolver.doResolve` converted to `undefined`, causing
  `ModulesInHierarchicalDirectoriesPlugin` to treat the lookup as "not found,
  try next directory" rather than a hard stop.

  Fix: when the `exports` field is present and a match is found but no valid
  target file can be resolved, return an explicit error to stop directory
  traversal. Closes #399.

- Imports field spec deviation: non-relative targets (e.g. `"#a": "#b"`) no longer re-enter imports resolution, aligning with the Node.js ESM spec where `PACKAGE_IMPORTS_RESOLVE` does not recursively resolve `#` specifiers. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#503](https://github.com/webpack/enhanced-resolve/pull/503))

  Previously `{ "#a": "#b", "#b": "./the.js" }` would chain-resolve `#a` to `./the.js`; now it correctly fails, matching Node.js behavior.

- Move `cachedJoin`/`cachedDirname`/`createCachedBasename` caches from module-level globals to per-Resolver instances. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#507](https://github.com/webpack/enhanced-resolve/pull/507))
  This prevents unbounded memory growth in long-running processes — when a Resolver is garbage collected, its join/dirname/basename caches are released with it.

  Also export `createCachedJoin`, `createCachedDirname` and `createCachedBasename` factory functions from `util/path` for creating independent cache instances.

- Fixed when `tsconfig: true` is used (default config file) and no `tsconfig.json` exists. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#502](https://github.com/webpack/enhanced-resolve/pull/502))

- Improved performance of the alias plugin. (by [@alexander-akait](https://github.com/alexander-akait) in [#529](https://github.com/webpack/enhanced-resolve/pull/529))

- Replace the `Set<string>`-based resolver stack with a singly-linked `StackEntry` class that exposes a Set-compatible API (`has`, iteration, `size`, `toString`). (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#526](https://github.com/webpack/enhanced-resolve/pull/526))

  Each `doResolve` call now prepends a single linked-list node instead of cloning the entire Set, making stack push O(1) in time and memory. Recursion detection walks the linked list (O(n)), but because the stack is typically shallow this is much cheaper than cloning a Set per call.

  Because `StackEntry` implements the Set methods consumers use in practice, `resolveContext.stack` remains a drop-in replacement — existing callers that iterate or call `.has()` keep working.

  Benchmarks on the local suite:
  - `pathological-deep-stack` (50-level alias chain): +57%
  - `realistic-midsize` warm cache: +16%

- Cache the result of `stripJsonComments` + `JSON.parse` in `readJson` using a `WeakMap` keyed by the raw file buffer. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#524](https://github.com/webpack/enhanced-resolve/pull/524))
  When `CachedInputFileSystem` serves the same buffer, the parsed result is reused; when the buffer is purged and garbage collected, the cache entry is automatically released.

  This avoids redundant comment-stripping and JSON parsing on every resolve call that reads tsconfig.json files (via `stripComments: true`), improving TsconfigPathsPlugin warm performance by ~20-35% depending on the depth of the `extends` chain.

- Avoid OOM in CachedInputFileSystem when duration is Infinity. (by [@alexander-akait](https://github.com/alexander-akait) in [#527](https://github.com/webpack/enhanced-resolve/pull/527))

## 5.20.1

### Patch Changes

- Optimize `TsconfigPathsPlugin` and fix extends resolution bugs. (by [@alexander-akait](https://github.com/alexander-akait) in [#492](https://github.com/webpack/enhanced-resolve/pull/492))

- Improve resolver cache hit rate. (by [@alexander-akait](https://github.com/alexander-akait) in [#492](https://github.com/webpack/enhanced-resolve/pull/492))
