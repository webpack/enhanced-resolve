---
"enhanced-resolve": patch
---

Imports field spec deviation: non-relative targets (e.g. `"#a": "#b"`)
no longer re-enter imports resolution, aligning with the Node.js ESM spec
where `PACKAGE_IMPORTS_RESOLVE` does not recursively resolve `#` specifiers.

Previously `{ "#a": "#b", "#b": "./the.js" }` would chain-resolve `#a` to
`./the.js`; now it correctly fails, matching Node.js behavior.
