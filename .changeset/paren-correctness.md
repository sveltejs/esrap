---
'esrap': patch
---

fix: preserve required parentheses in three more cases that changed meaning or produced invalid output

- nested same-sign unary operators (`-(-a)` was printed as `--a`, the decrement operator; `-(--a)` as invalid `---a`)
- parenthesized optional chains as a callee/object/tag/new (`(a?.b)()` was printed as `a?.b()`, silently changing short-circuit behavior; `new (a?.b)()` and ` (a?.b)` `` became invalid)
- `await` as the left operand of `**` (`(await a) ** b` was printed as the SyntaxError `await a ** b`)
