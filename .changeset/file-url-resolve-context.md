---
"enhanced-resolve": minor
---

Allow the `context` path and `request` arguments of `resolve` (and `resolveSync`/`resolvePromise`) to accept `file:` `URL` instances, converting them to filesystem paths. Plain strings stay literal paths, matching Node's `fs`.
