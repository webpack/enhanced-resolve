---
"enhanced-resolve": patch
---

fix: properly handle DOS device paths (`\\?\…` and `\\.\…`) on Windows

Requests and context paths using the Win32 file namespace (`\\?\C:\…`,
`\\?\UNC\server\share\…`) or device namespace (`\\.\C:\…`) were not
handled correctly:

- `getType()` classified them as `Normal`, so `normalize`, `dirname`,
  and `join` ran them through posix helpers and failed to collapse `..`
  segments or compute parents correctly.
- `parseIdentifier()` split on the literal `?` inside `\\?\`, turning a
  valid absolute request into a bogus module lookup under
  `node_modules`.
- `cdUp()` returned `\` from `\` (via `slice(0, i || 1)`), so
  `loadDescriptionFile` walked forever once it reached the UNC/device
  root.

These paths are now recognized as Windows-absolute, parsed without
misinterpreting the prefix `?`, and the description-file walk
terminates at a bare `\` root. Plain UNC (`\\server\share\…`) remains
out of scope.
