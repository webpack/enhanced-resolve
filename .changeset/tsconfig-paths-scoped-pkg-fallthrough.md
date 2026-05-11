---
"enhanced-resolve": patch
---

TsconfigPathsPlugin now falls through to normal module resolution when a `paths` pattern matches but the mapped path does not exist, matching TypeScript's native resolution behavior. Previously, patterns like `"@*"` would block scoped npm packages (e.g. `@sentry/react`) from resolving via `node_modules`.
