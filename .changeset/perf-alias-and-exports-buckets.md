---
"enhanced-resolve": patch
---

Speed up alias resolution on the hot path.

- `AliasPlugin` / `TsconfigPathsPlugin`: bucket compiled alias options by the first char code of `name`, so resolves skip options whose name can't possibly match the request's first char. Gated to cases with 2+ distinct first chars so degenerate single-bucket lists (e.g. long alias chains) don't pay for the `Map.get`.
- `TsconfigPathsPlugin`: memoize `_selectPathsDataForContext(map, requestPath)` per map so the per-source-file `contextList` scan only runs once per directory. Gated to maps with 2+ contexts so single-context tsconfigs aren't penalized by the cache lookup.

Biggest wins on alias-heavy configs (300+ entries): `huge-alias-miss` +151%, `huge-alias-list` +126%, `alias-first-char-miss` +120%.
