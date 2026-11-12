---
"enhanced-resolve": patch
---

Resolve `paths` inherited through `extends` (with no `baseUrl`) relative to the tsconfig that declares them, substitute `${configDir}` in an inherited `baseUrl`, treat an empty `baseUrl` as the directory of its tsconfig, like tsc, and stop extending a tsconfig from changing it for later loads that share the file system cache.
