---
"enhanced-resolve": patch
---

Replace the `Set<string>`-based resolver stack with a singly-linked `StackEntry` class that exposes a Set-compatible API (`has`, iteration, `size`, `toString`).

Each `doResolve` call now prepends a single linked-list node instead of cloning the entire Set, making stack push O(1) in time and memory. Recursion detection walks the linked list (O(n)), but because the stack is typically shallow this is much cheaper than cloning a Set per call.

Because `StackEntry` implements the Set methods consumers use in practice, `resolveContext.stack` remains a drop-in replacement — existing callers that iterate or call `.has()` keep working.

Benchmarks on the local suite:

- `pathological-deep-stack` (50-level alias chain): +57%
- `realistic-midsize` warm cache: +16%
