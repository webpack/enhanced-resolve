---
"enhanced-resolve": patch
---

Speed up alias and field resolution on the hot path.

- `AliasPlugin` / `TsconfigPathsPlugin`: bucket compiled alias options by the first char code of `name`, so resolves skip options whose name can't possibly match the request's first char. Gated to cases with 2+ distinct first chars so degenerate single-bucket lists (e.g. long alias chains) don't pay for the `Map.get`.
- `TsconfigPathsPlugin`: memoize `_selectPathsDataForContext(map, requestPath)` per map so the per-source-file `contextList` scan only runs once per directory.
- Exports / imports field `findMatch`: pre-sort keys by `patternKeyCompare` so the inner loop can break on the first satisfying candidate; also partition by the char at the first informative position (`./` exports → pos 2, `#` imports → pos 1) so requests that don't share that char fast-reject without any `startsWith` calls.
- Exports / imports field processor: memoize the full `[paths, usedField]` result per `(field, conditionNames, request)` so warm hits skip the `directMapping` / `targetMapping` walk that rebuilds the output `string[]` (and applies wildcard substitution) on every call.

Biggest wins on alias-heavy configs (300+ entries): `huge-alias-miss` +151%, `huge-alias-list` +126%, `alias-first-char-miss` +120%.
