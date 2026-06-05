---
"enhanced-resolve": minor
---

Allow the path-like resolve options `roots`, `modules`, `alias`/`fallback` targets, `restrictions`, and `tsconfig` (the config file, `configFile`, `baseUrl`, and `references`) to accept file `URL` instances (such as `new URL("./dir/", import.meta.url)`), converting them to filesystem paths. Plain strings are still treated as literal paths, matching Node's `fs`.
