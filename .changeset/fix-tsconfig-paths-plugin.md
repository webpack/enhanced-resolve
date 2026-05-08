---
"enhanced-resolve": patch
---

Fix TsconfigPathsPlugin circular project references causing stack overflow, add support for extending from unscoped npm packages, and use `stat` instead of `readFile` for existence checks in extends resolution.
