---
"enhanced-resolve": patch
---

fix: prevent fallback to parent node_modules when exports field target file is not found

When a package has an `exports` field that maps a request to a target file,
but that target file does not exist on disk, enhanced-resolve was incorrectly
falling back to search parent `node_modules` directories. This violated the
Node.js ESM resolution spec, which requires resolution to fail with an error
rather than continue searching up the directory tree.

This manifested in monorepos where the same package exists at multiple levels
(e.g. `workspace/node_modules/pkg` and `root/node_modules/pkg`): if the
workspace version's exports-mapped target was missing, the resolver would
silently resolve to the root version instead.

Root cause: `ExportsFieldPlugin` was returning `null` on failure, which
`Resolver.doResolve` converted to `undefined`, causing
`ModulesInHierarchicalDirectoriesPlugin` to treat the lookup as "not found,
try next directory" rather than a hard stop.

Fix: when the `exports` field is present and a match is found but no valid
target file can be resolved, return an explicit error to stop directory
traversal. Closes #399.
