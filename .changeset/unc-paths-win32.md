---
"enhanced-resolve": patch
---

Treat a UNC path (`\\server\share\…`) as a Windows path, so it normalizes, joins and walks up with `path.win32` semantics instead of being taken for a bare module request.
