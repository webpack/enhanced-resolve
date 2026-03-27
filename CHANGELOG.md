# enhanced-resolve

## 5.20.2

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

- Imports field spec deviation: non-relative targets (e.g. `"#a": "#b"`) (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#503](https://github.com/webpack/enhanced-resolve/pull/503))
  no longer re-enter imports resolution, aligning with the Node.js ESM spec
  where `PACKAGE_IMPORTS_RESOLVE` does not recursively resolve `#` specifiers.

  Previously `{ "#a": "#b", "#b": "./the.js" }` would chain-resolve `#a` to
  `./the.js`; now it correctly fails, matching Node.js behavior.

- When `tsconfig: true` is used (default config file) and no `tsconfig.json` (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#502](https://github.com/webpack/enhanced-resolve/pull/502))
  exists, `TsconfigPathsPlugin` threw a file-not-found error that caused
  the entire resolve to fail — even for relative imports that don't need
  tsconfig path mappings.

  Fix: when using the default config file and `tsconfig.json` is not found,
  the plugin now returns `null` and lets resolution continue normally.
  When the user provides an explicit path (string), a missing file still
  throws an error as expected.

## 5.20.1

### Patch Changes

- Optimize `TsconfigPathsPlugin` and fix extends resolution bugs. (by [@alexander-akait](https://github.com/alexander-akait) in [#492](https://github.com/webpack/enhanced-resolve/pull/492))

- Improve resolver cache hit rate. (by [@alexander-akait](https://github.com/alexander-akait) in [#492](https://github.com/webpack/enhanced-resolve/pull/492))
