---
"enhanced-resolve": patch
---

Fix string `restrictions` boundary checks: a restriction ending with a separator no longer rejects everything inside it, `\` is only a separator in Windows paths, and restrictions are normalized before they are compared.
