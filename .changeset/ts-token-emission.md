---
'esrap': patch
---

fix: print valid TypeScript for `asserts` predicates, qualified namespaces, and computed signature keys

These were previously emitted as invalid output:

- `asserts` type predicates were printed in the wrong order (`asserts x is T` became `x asserts T`)
- qualified namespace/module names were mangled (`namespace A.B.C` became `namespace Anamespace Bnamespace C`)
- computed keys in method/property signatures lost their brackets (`interface I { [Symbol.iterator](): T }` became `Symbol.iterator(): T`)
