---
"enhanced-resolve": patch
---

Make the resolver runtime-agnostic so it works in browsers, Deno and Bun as well as Node. File contents are decoded without assuming a Node `Buffer`, and browser shims are provided for the `path`, `url` and `graceful-fs` builtins (Node, Deno and Bun keep using the native ones) so the package bundles for the browser — supply your own `fileSystem` there.
