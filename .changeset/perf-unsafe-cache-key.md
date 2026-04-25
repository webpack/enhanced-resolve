---
"enhanced-resolve": patch
---

Build the `UnsafeCachePlugin` cache id by string concatenation with a `\0` separator instead of `JSON.stringify({ … })`. ~3–5× faster on the `described-resolve` hot path when `unsafeCache` is on, since we avoid the object-literal allocation and the JSON serializer for fields that are already plain strings. The cache is in-process and not persisted across runs, so the cache-key format change is invisible to consumers. `\0` is safe as a separator: path/request/query/fragment cannot contain a raw NUL (`identifier.js` decodes any `\0`-escape back to the original char), and the context, when included, is `JSON.stringify`d which escapes any NUL. The old code carried a commented-out version of this implementation labeled "TODO use it in the next major release, it is faster" — this enables it. CodSpeed measured `+13.51%` simulation speedup on the `node-compare: enhanced-resolve sync x 1000 (fs + unsafeCache)` benchmark.
