---
"enhanced-resolve": patch
---

Restore full back-compat with callers that pass `resolveContext.stack: new Set<string>()` (the pre-5505bb2 shape).

The linked-list `StackEntry` change kept a partial fallback in `doResolve` but only matched pre-seeded Set entries at the first call and polluted the linked-list iteration. This change normalizes a legacy Set once — stores the strings on a `preSeeded` field that propagates through the chain — so pre-seeded entries are checked at every depth and error-message iteration stays clean. No extra work on the hot path when no Set is passed (`preSeeded` is `undefined` and the branch is skipped).
