---
"enhanced-resolve": minor
---

Add experimental support for [Node.js package maps](https://nodejs.org/api/packages.html#package-maps) through a new `packageMap` option, which takes the path of the configuration file (or a `file:` `URL`) or an already-parsed `packages` object. When it is set, a bare specifier is resolved through the importing package's `dependencies` table and the target package's location is handed to the regular pipeline, instead of walking `node_modules`; relative and absolute requests and `node:` builtins are unaffected. Because several package entries may share one `url`, the package a request resolved into is exposed as `packageId` on the result and can be passed back in as `context.packageId` to resolve from that package unambiguously. Package maps are stability 1 (experimental) in Node.js, and this option tracks that specification and may change with it.
