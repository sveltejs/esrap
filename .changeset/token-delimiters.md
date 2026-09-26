---
'esrap': minor
---

feat: add a `tokens` option to `print`. Pass the parser's tokens (e.g. Acorn's `onToken` array, or `ast.tokens` from typescript-eslint) and punctuation and keywords written by visitors — brackets, parentheses, braces, `else`, `extends`, `as` and so on — are mapped to their location in the source
