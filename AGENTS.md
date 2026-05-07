# enhanced-resolve Development Guide

> Note: CLAUDE.md is a symlink to AGENTS.md. They are the same file.

For common webpack org rules (CLA, commit identity, PR template, AI policy, changeset conventions), see **[webpack/webpack AGENTS.md](https://github.com/webpack/webpack/blob/main/AGENTS.md)**. This file only covers what is specific to enhanced-resolve.

## Project Overview

enhanced-resolve is an async module resolution library used by webpack. Package manager: **yarn**.

- `lib/` — Main source code
- `lib/util/` — Internal utilities (path handling, fs helpers, identifier parsing)
- `lib/Resolver.js` — Core resolver with hook system (tapable)
- `lib/ResolverFactory.js` — Creates resolvers from options; wires the plugin pipeline
- `lib/index.js` — Public API entry point
- `test/` — All tests (Jest)
- `test/fixtures/` — Test fixture directories and files
- `.changeset/` — Changeset files for releases
- `types.d.ts` — Auto-generated type definitions (do not edit manually)
- `package.json` — All available commands (defined in `scripts`)

## Architecture

The resolver is a plugin pipeline built on [tapable](https://github.com/webpack/tapable) hooks. Each plugin taps into a named hook and forwards results to the next hook via `resolver.doResolve()`. The full pipeline is wired in `lib/ResolverFactory.js` under the `//// pipeline ////` section.

Key pipeline flow:

```
resolve → parsedResolve → describedResolve → rawResolve → normalResolve
  → rawModule → module → resolveAsModule → ... → rawFile → file → finalFile
  → existingFile → [SymlinkPlugin] → resolved → [RestrictionsPlugin] → [ResultPlugin] → result
```

- Options like `symlinks`, `extensions`, `alias`, etc. control which plugins are added
- `CachedInputFileSystem` wraps `fs` with in-memory caching for `stat`, `readdir`, `readlink`, etc.
- `UnsafeCachePlugin` caches successful resolves by input request
- Types are defined via JSDoc `@typedef` in source files; `types.d.ts` is generated from them

## Development Workflow

### 1. Making Changes to `lib/`

Modify source code in `lib/` as needed.

If your change adds or modifies resolver options:

1. Add the option to `UserResolveOptions` and `ResolveOptions` JSDoc typedefs in `lib/ResolverFactory.js`
2. Add the default value in `createOptions()`
3. Wire the new plugin in the pipeline section
4. Run `yarn fix:special` to regenerate `types.d.ts`

### 2. Writing and Running Tests

**For bug fixes, always write the test case first.** Run the test to confirm it fails, reproducing the bug. Then make the code change and re-run the test — a passing test confirms the fix.

```bash
yarn test:only                                        # Run all tests
yarn test:only -- test/resolve.test.js                # Run a specific test file
yarn test:only -- test/resolve.test.js -t "name"      # Run a specific test by name
```

Test conventions:

- Test files are in `test/` and named `*.test.js`
- Fixture files go in `test/fixtures/`
- For temporary files (symlinks, hardlinks), create them in `beforeEach` and clean up in `afterEach` (see `test/symlink.test.js` for the pattern)
- Use `resolve.create({ ...options })` for custom resolver configs in tests
- For tests that need a fresh filesystem cache, create a new `CachedInputFileSystem` with `duration: 0`

### 3. Linting, Formatting, and Type Checking

```bash
yarn fix:code        # ESLint autofix
yarn fmt             # Prettier format
yarn lint:types      # TypeScript type check
yarn lint:spellcheck # cspell spell check
```

If any `lib/` file's JSDoc types were modified, run `yarn fix:special` to regenerate `types.d.ts`.

Pre-commit hooks (husky + lint-staged) run ESLint, Prettier, and cspell automatically on staged files. If cspell reports unknown words, add them to `.cspell.json`.
