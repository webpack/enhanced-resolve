---
"enhanced-resolve": minor
---

Add `extensionAliasForExports` option. When `true`, `extensionAlias` also applies to paths resolved through the `package.json` `exports` field. Off by default to match Node.js; opt in for full TypeScript-resolver parity with packages that ship `.ts` sources alongside the compiled `.js` they declare in `exports`.
