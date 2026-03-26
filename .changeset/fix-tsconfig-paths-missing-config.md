---
"enhanced-resolve": patch
---

When `tsconfig: true` is used (default config file) and no `tsconfig.json`
exists, `TsconfigPathsPlugin` threw a file-not-found error that caused
the entire resolve to fail — even for relative imports that don't need
tsconfig path mappings.

Fix: when using the default config file and `tsconfig.json` is not found,
the plugin now returns `null` and lets resolution continue normally.
When the user provides an explicit path (string), a missing file still
throws an error as expected.
