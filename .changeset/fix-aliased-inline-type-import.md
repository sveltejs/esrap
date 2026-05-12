---
'esrap': patch
---

fix: emit valid TS for aliased inline-type import specifiers

`ImportSpecifier` with both `importKind: 'type'` and an alias (e.g.
`import { type Foo as Bar } from '...'`) was being printed as
`Foo as type Bar`, which is not valid TypeScript. The `type` keyword now
precedes the imported identifier instead of the local.
