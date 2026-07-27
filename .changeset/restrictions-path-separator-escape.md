---
"enhanced-resolve": patch
---

Stop a filename containing a backslash from escaping a string `restrictions` entry on posix, by only accepting the platform separator as a segment boundary.
