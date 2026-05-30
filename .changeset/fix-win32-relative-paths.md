---
"enhanced-resolve": patch
---

Recognize win32 relative paths (e.g. `..\src`) in `getType` and `isRelativeRequest`. On Windows, `path.relative()` returns backslash-separated paths that were previously misclassified as bare specifiers, causing resolution to fail. Backslashes in relative paths are now normalized to forward slashes internally.
