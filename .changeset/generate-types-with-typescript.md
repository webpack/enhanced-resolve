---
"enhanced-resolve": minor
---

Generate the published type declarations with TypeScript instead of `webpack/tooling`, which is no longer a dependency. Every name the package exported before is still exported, and `types.d.ts` is still the entry point, but the declarations themselves now live in `types/` and are emitted by `tsc` from the JSDoc in `lib/`. Two shapes follow the sources more closely than the previous generator did: the object form of `Plugin` no longer declares `this: Resolver` on `apply` (it is called as `plugin.apply(resolver)`, so `this` is the plugin), and the entries of `ResolveContext.stack` declare `name: string | undefined` rather than an optional `name`. Class fields that the old generator dropped, such as the cache backends on `CachedInputFileSystem`, are now part of the declarations.
