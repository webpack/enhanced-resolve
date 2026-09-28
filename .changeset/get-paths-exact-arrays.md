---
"enhanced-resolve": patch
---

Size the ancestor path and segment arrays that `getPathsCached` keeps to what they actually hold: a `push`-built store keeps room for 17 entries while a path has a handful, and the cache holds these for the filesystem's lifetime.
