---
"enhanced-resolve": patch
---

Cache the result of `stripJsonComments` + `JSON.parse` in `readJson` using a `WeakMap` keyed by the raw file buffer.
When `CachedInputFileSystem` serves the same buffer, the parsed result is reused; when the buffer is purged and garbage collected, the cache entry is automatically released.

This avoids redundant comment-stripping and JSON parsing on every resolve call that reads tsconfig.json files (via `stripComments: true`), improving TsconfigPathsPlugin warm performance by ~20-35% depending on the depth of the `extends` chain.
