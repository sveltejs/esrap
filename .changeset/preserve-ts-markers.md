---
'esrap': patch
---

fix: stop silently dropping TypeScript markers when printing

Several modifiers and type parameters were omitted from the output, which
changes a program's type contract while still producing valid-looking code:

- optional parameters (`a?: T`) lost their `?` (functions, arrows, methods, signatures)
- class fields lost `?`, `!`, `readonly`, `declare`, and `override`
- classes and methods lost their type parameters (`class A<T>`, `m<T>()`)
- type-parameter modifiers `const` / `in` / `out` were dropped
- mapped-type `readonly`/`?` modifiers (including `+`/`-`) and `as` key-remapping were dropped
