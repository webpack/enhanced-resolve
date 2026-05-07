---
"enhanced-resolve": patch
---

Fix `TsconfigPathsPlugin` to support synchronous resolution. The plugin was implemented with `async`/`await` and `Promise`-wrapped file system calls, so its `tapAsync` handlers always invoked their callback after a Promise tick. That made `resolveSync` throw `Cannot 'resolveSync' because the fileSystem is not sync. Use 'resolve'!` whenever `tsconfig` was enabled, even with `useSyncFileSystemCalls: true` (issue #571). The plugin and `util/fs#readJson` are now callback-based, so when the underlying file system is synchronous the entire chain stays synchronous and `resolveSync` works as expected.
