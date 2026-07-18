---
'esrap': minor
---

Add a `boundaryTokens` language option that anchors structural tokens (array/object brackets and braces, preserved parentheses, unary operators, and the closing tokens of calls and computed member access) with one-character source locations, so node-boundary positions resolve through the source map instead of being attributed to the previous token. Off by default; output is byte-identical either way
