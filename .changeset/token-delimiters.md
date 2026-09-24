---
'esrap': minor
---

feat: add a `tokens` option to the `ts` and `tsx` languages. Pass the parser's tokens and everything inside a node that no node boundary locates is mapped to its source position: the brackets of computed keys, the parentheses of parameter lists, calls and control-flow heads, the braces of import and export lists, enums and static blocks, template interpolations, and keywords after a node's first token such as `function` after `async`, `else`, `finally`, `while`, `default`, `type`, class and member modifiers, `extends`, `implements`, `in`, `of`, `as` and `satisfies`. Closing delimiters at a node's end are mapped from the node's end without tokens.
