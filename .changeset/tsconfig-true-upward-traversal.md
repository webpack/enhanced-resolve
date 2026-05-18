---
"enhanced-resolve": patch
---

When `tsconfig: true` is used, walk up parent directories to find `tsconfig.json`, matching TypeScript's own `findConfigFile` behavior.
