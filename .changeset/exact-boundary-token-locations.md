---
'esrap': minor
---

Locate delimiters internal to AST nodes exactly in `boundaryTokens` source maps. Pass the parser's `tokens` and the brackets of computed keys, the parentheses of calls, functions and control-flow statements, and the braces of import/export lists, enums, static blocks and template interpolations are anchored to their real source positions. Computed-key brackets are no longer guessed from the key's position; without `tokens` they are left unmapped.
