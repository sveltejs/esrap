---
'esrap': patch
---

fix: add parentheses required by specific grammar positions

Previously esrap could drop parentheses that the position requires, producing invalid output or changing meaning:

- the `extends` super-class (`class A extends (B || C) {}`)
- a tagged-template tag (`` (x || y)`tpl` ``)
- a decorator expression (`@(a ? b : c)`)
- an angle-bracket type assertion as the left of `**` (`(<T>x) ** y`)
- an expression statement that would otherwise start with `{`, `function`, or `class` (`({} + [])`, `(class {})`, `` (function(){})`x` ``)
