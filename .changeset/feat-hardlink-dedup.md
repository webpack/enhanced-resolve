---
"enhanced-resolve": minor
---

Add `hardlinks` option to deduplicate hardlinked files by resolving them to the same canonical path based on filesystem inode. This is useful with pnpm, which hardlinks packages from a global content-addressable store — without this option, bundlers treat each path as a separate module and emit duplicate code. Set `hardlinks: true` to enable.
