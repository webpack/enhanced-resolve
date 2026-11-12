---
"enhanced-resolve": patch
---

Resolve `paths` inherited through `extends` (with no `baseUrl`) relative to the tsconfig that declares them, substitute `${configDir}` in an inherited `baseUrl`, and treat an empty `baseUrl` as the directory of its tsconfig, like tsc.
