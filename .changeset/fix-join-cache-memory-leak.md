---
"enhanced-resolve": patch
---

Move `cachedJoin`/`cachedDirname` caches from module-level globals to
per-Resolver instances. This prevents unbounded memory growth in
long-running processes — when a Resolver is garbage collected, its
join/dirname caches are released with it.

Also export `createCachedJoin` and `createCachedDirname` factory
functions from `util/path` for creating independent cache instances.
