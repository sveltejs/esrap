---
'esrap': patch
---

fix: preserve more TypeScript markers when printing

Type parameters (classes & methods), class-field `?`/`!`/`readonly`/`declare`/`override`, type-parameter modifiers (`const`/`in`/`out`), and mapped-type modifiers were silently dropped.
