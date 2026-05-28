# enhanced-resolve

## 5.22.1

### Patch Changes

- Fix `restrictions` bypass via an in-root symlink pointing outside the root. (by [@alexander-akait](https://github.com/alexander-akait) in [#595](https://github.com/webpack/enhanced-resolve/pull/595))

## 5.22.0

### Minor Changes

- `CachedInputFileSystem#purge` accepts a second `{ exact?: boolean }` argument; `exact: true` removes only entries whose key matches `what` exactly instead of any entry whose key starts with `what`. (by [@alexander-akait](https://github.com/alexander-akait) in [#591](https://github.com/webpack/enhanced-resolve/pull/591))

## 5.21.6

### Patch Changes

- Speed up alias resolution on the hot path. (by [@alexander-akait](https://github.com/alexander-akait) in [#589](https://github.com/webpack/enhanced-resolve/pull/589))
  - `AliasPlugin` / `TsconfigPathsPlugin`: bucket compiled alias options by the first char code of `name`, so resolves skip options whose name can't possibly match the request's first char. Gated to cases with 2+ distinct first chars so degenerate single-bucket lists (e.g. long alias chains) don't pay for the `Map.get`.
  - `TsconfigPathsPlugin`: memoize `_selectPathsDataForContext(map, requestPath)` per map so the per-source-file `contextList` scan only runs once per directory. Gated to maps with 2+ contexts so single-context tsconfigs aren't penalized by the cache lookup.

  Biggest wins on alias-heavy configs (300+ entries): `huge-alias-miss` +151%, `huge-alias-list` +126%, `alias-first-char-miss` +120%.

## 5.21.5

### Patch Changes

- Don't add configDir to modules when tsconfig has no baseUrl. (by [@alexander-akait](https://github.com/alexander-akait) in [`61f36fd`](https://github.com/webpack/enhanced-resolve/commit/61f36fd0bb7130a680fe747dc5e2d6589e3c9147))

## 5.21.4

### Patch Changes

- When `tsconfig: true` is used, walk up parent directories to find `tsconfig.json`, matching TypeScript's own `findConfigFile` behavior. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#585](https://github.com/webpack/enhanced-resolve/pull/585))

## 5.21.3

### Patch Changes

- TsconfigPathsPlugin now falls through to normal module resolution when a `paths` pattern matches but the mapped path does not exist, matching TypeScript's native resolution behavior. Previously, patterns like `"@*"` would block scoped npm packages (e.g. `@sentry/react`) from resolving via `node_modules`. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#579](https://github.com/webpack/enhanced-resolve/pull/579))

## 5.21.2

### Patch Changes

- Fix TsconfigPathsPlugin circular project references causing stack overflow, add support for extending from unscoped npm packages, and use `stat` instead of `readFile` for existence checks in extends resolution. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#575](https://github.com/webpack/enhanced-resolve/pull/575))

- perf: dedupe miss paths in `DirectoryExistsPlugin`/`FileExistsPlugin` and prune the per-resolve `TsconfigPathsPlugin` context scan. (by [@alexander-akait](https://github.com/alexander-akait) in [#574](https://github.com/webpack/enhanced-resolve/pull/574))

- perf: drop a dead Map lookup in `findMatch` and flatten `AliasFieldPlugin`'s cache check. (by [@alexander-akait](https://github.com/alexander-akait) in [#574](https://github.com/webpack/enhanced-resolve/pull/574))

- perf: hot-path tweaks in `ImportsFieldPlugin`, `AliasUtils`, and `util/entrypoints`. (by [@alexander-akait](https://github.com/alexander-akait) in [#574](https://github.com/webpack/enhanced-resolve/pull/574))

- perf: cut per-resolve allocations in `Resolver.parse`, `loadDescriptionFile`, and `TsconfigPathsPlugin._selectPathsDataForContext`. (by [@alexander-akait](https://github.com/alexander-akait) in [#574](https://github.com/webpack/enhanced-resolve/pull/574))

## 5.21.1

### Patch Changes

- Allocation-free reductions on hot-path code: hoist `/#/g`, `/\$/g` and `/\\/g` to module-level constants and gate the corresponding `.replace` calls behind `includes(…)` so paths/queries/requests without the match char skip the regex state machine entirely (the common case); share a single `EMPTY_NO_MATCH` tuple instead of allocating `[[], null]` per "no match" / "no condition matched" return; switch `directMapping`'s `for...of` over `mappingTarget` and inner results to indexed loops to avoid iterator-object allocation per call; inline `isConditionalMapping` at its two hot-path call sites and merge the duplicate `default` / `conditionNames.has(condition)` branches in `computeConditionalMapping`; replace `invalidSegmentRegEx.exec(…) !== null` with `.test(…)` (no match-array allocation); drop the dead `deprecatedInvalidSegmentRegEx.test(…) !== null` clause in `ImportsFieldPlugin` (`.test` returns boolean; `true !== null` and `false !== null` are both true, so it was `&& true`); drop the redundant `relativePath.length === 0` guard before `!startsWith("./")` in `ExportsFieldPlugin` (the empty-string case is already covered). (by [@alexander-akait](https://github.com/alexander-akait) in [#558](https://github.com/webpack/enhanced-resolve/pull/558))

- restore plugin compatibility for `[...resolveContext.stack]` iteration (by [@alexander-akait](https://github.com/alexander-akait) in [#569](https://github.com/webpack/enhanced-resolve/pull/569))

- fix `TsconfigPathsPlugin` to support `resolveSync` with `useSyncFileSystemCalls` (by [@alexander-akait](https://github.com/alexander-akait) in [#572](https://github.com/webpack/enhanced-resolve/pull/572))

## 5.21.0

### Minor Changes

- Added promise API and support to resolve without `context` and `resolveContext`. (by [@alexander-akait](https://github.com/alexander-akait) in [#520](https://github.com/webpack/enhanced-resolve/pull/520))

- Add `extensionAliasForExports` option. When `true`, `extensionAlias` also applies to paths resolved through the `package.json` `exports` field. Off by default to match Node.js; opt in for full TypeScript-resolver parity with packages that ship `.ts` sources alongside the compiled `.js` they declare in `exports`. (by [@alexander-akait](https://github.com/alexander-akait) in [#554](https://github.com/webpack/enhanced-resolve/pull/554))

### Patch Changes

- Properly handle DOS device paths (`\\?\…` and `\\.\…`). (by [@alexander-akait](https://github.com/alexander-akait) in [#551](https://github.com/webpack/enhanced-resolve/pull/551))

- Prevent fallback to parent node_modules when the `exports` field target file is not found. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#495](https://github.com/webpack/enhanced-resolve/pull/495))

- Imports field spec deviation: non-relative targets (e.g. `"#a": "#b"`) no longer re-enter imports resolution, aligning with the Node.js ESM spec where `PACKAGE_IMPORTS_RESOLVE` does not recursively resolve `#` specifiers. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#503](https://github.com/webpack/enhanced-resolve/pull/503))

  Previously `{ "#a": "#b", "#b": "./the.js" }` would chain-resolve `#a` to `./the.js`; now it correctly fails, matching Node.js behavior.

- Move `cachedJoin`/`cachedDirname`/`createCachedBasename` caches from module-level globals to per-Resolver instances. This prevents unbounded memory growth in long-running processes — when a Resolver is garbage collected, its join/dirname/basename caches are released with it. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#507](https://github.com/webpack/enhanced-resolve/pull/507))

- Fixed when `tsconfig: true` is used (default config file) and no `tsconfig.json` exists. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#502](https://github.com/webpack/enhanced-resolve/pull/502))

- Apply the `extensionAlias` option to the `imports` field to be align with typescript resolution. (by [@alexander-akait](https://github.com/alexander-akait) in [#549](https://github.com/webpack/enhanced-resolve/pull/549))

- Improved performance of the many plugins. (by [@alexander-akait](https://github.com/alexander-akait) in [#529](https://github.com/webpack/enhanced-resolve/pull/529))

- Replace the `Set<string>`-based resolver stack with a singly-linked `StackEntry` class that exposes a Set-compatible API. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#526](https://github.com/webpack/enhanced-resolve/pull/526))

  Each `doResolve` call now prepends a single linked-list node instead of cloning the entire Set, making stack push O(1) in time and memory. Recursion detection walks the linked list (O(n)), but because the stack is typically shallow this is much cheaper than cloning a Set per call.

- Cache the result of `stripJsonComments` + `JSON.parse` in `readJson` using a `WeakMap` keyed by the raw file buffer. This avoids redundant comment-stripping and JSON parsing on every resolve call that reads tsconfig.json files (via `stripComments: true`), improving TsconfigPathsPlugin warm performance by ~20-35% depending on the depth of the `extends` chain. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#524](https://github.com/webpack/enhanced-resolve/pull/524))

- Avoid OOM in CachedInputFileSystem when duration is Infinity. (by [@alexander-akait](https://github.com/alexander-akait) in [#527](https://github.com/webpack/enhanced-resolve/pull/527))

## 5.20.1

### Patch Changes

- Optimize `TsconfigPathsPlugin` and fix extends resolution bugs. (by [@alexander-akait](https://github.com/alexander-akait) in [#492](https://github.com/webpack/enhanced-resolve/pull/492))

- Improve resolver cache hit rate. (by [@alexander-akait](https://github.com/alexander-akait) in [#492](https://github.com/webpack/enhanced-resolve/pull/492))
