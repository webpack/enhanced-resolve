---
"enhanced-resolve": minor
---

`CachedInputFileSystem#purge` accepts a second `{ exact?: boolean }` argument; `exact: true` removes only entries whose key matches `what` exactly instead of any entry whose key starts with `what`.
