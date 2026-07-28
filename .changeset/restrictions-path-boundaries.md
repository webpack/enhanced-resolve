---
"enhanced-resolve": patch
---

Fix string `restrictions` boundary checks: a restriction ending with a separator no longer rejects everything inside it, restrictions are normalized before they are compared, and a Windows path now matches the way `path.win32` does, treating `/` and `\` as interchangeable and comparing case-insensitively, while `\` stays a filename character in a posix path. The same comparison backs `tsconfig` path matching.
