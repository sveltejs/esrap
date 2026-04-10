---
'esrap': patch
---

fix: make `@typescript-eslint/types` an optional peer dependency

`print()` is also used in non-TypeScript contexts (e.g. with `@types/estree` nodes), where `@typescript-eslint/types` as a regular dependency can cause type conflicts. Now optional, so `ts()`/`tsx()` visitors work with any node type.
