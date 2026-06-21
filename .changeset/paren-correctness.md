---
'esrap': patch
---

fix: preserve required parentheses that were being dropped, changing meaning or producing invalid output (nested unary operators, parenthesized optional chains, and `await` as the left operand of `**`)
