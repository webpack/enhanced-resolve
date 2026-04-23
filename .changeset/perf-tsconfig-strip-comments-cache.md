---
"enhanced-resolve": patch
---

Cache the result of `stripJsonComments` + `JSON.parse` in `readJson` using a `WeakMap` keyed by the raw file buffer. This avoids redundant comment-stripping and JSON parsing on every resolve call that reads tsconfig.json files (via `stripComments: true`), improving TsconfigPathsPlugin warm performance by ~20-35% depending on the depth of the `extends` chain.
