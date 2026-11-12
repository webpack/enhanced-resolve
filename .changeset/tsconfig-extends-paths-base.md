---
"enhanced-resolve": patch
---

Resolve `paths` inherited through `extends` (with no `baseUrl`) relative to the tsconfig that declares them, and substitute `${configDir}` in an inherited `baseUrl`, like tsc.
