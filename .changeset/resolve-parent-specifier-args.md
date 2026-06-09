---
"enhanced-resolve": patch
---

Rename the positional `resolve`/`resolveSync`/`resolvePromise` parameters to `parent`/`specifier` (from `path`/`request`) for ESM-aligned naming and document them in the README. Purely cosmetic — arguments are positional, so there is no behavior or API change.
