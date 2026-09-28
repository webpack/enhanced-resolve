---
"enhanced-resolve": patch
---

Size the ancestor path and segment arrays `getPaths` returns from the split that produced them, instead of growing them with `push`: a grown store keeps room for 17 entries, and these arrays are kept for the lifetime of the filesystem by `getPathsCached`.
