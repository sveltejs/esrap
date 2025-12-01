# esrap changelog

## 2.2.1

### Patch Changes

- 4b2b920: fix: loosen types for `getLeadingComments` and `getTrailingComments`

## 2.2.0

### Minor Changes

- da2f84d: feat: add `getLeadingComments` & `getTrailingComments` option for programmatic comment insertion

## 2.1.3

### Patch Changes

- 9bf2740: fix: support export class with decorators

## 2.1.2

### Patch Changes

- 53b485d: fix: support typescript class decorator

## 2.1.1

### Patch Changes

- 9a7693e: fix: support more typescript nodes

## 2.1.0

### Minor Changes

- 3c9abb3: feat: add `context.space()` method

### Patch Changes

- 3c9abb3: fix: add newline after line comment following statement

## 2.0.1

### Patch Changes

- 922292a: fix: support `implements` with an empty array and with more than 1

## 2.0.0

### Major Changes

- a5f91d5: breaking: add support for custom printers
- 029962b: breaking: `print(...)` only accepts a node, not an array of nodes

### Minor Changes

- 6483d71: feat: experimental JSX support

## 1.4.9

### Patch Changes

- bd045a3: fix: support function return type
- bd045a3: fix: support decorator expression

## 1.4.8

### Patch Changes

- 61c9902: fix: only push `with` clause if attributes length is gt 0

## 1.4.7

### Patch Changes

- bab0228: fix: support import attributes

## 1.4.6

### Patch Changes

- 1caf836: fix: add missing spaces in interfaces
- 49d433b: fix: correctly handle parenthesised FunctionExpressions
- 76eabe8: fix: consistently escape escape characters
- 9daf5dd: fix: correct indentation of `TSModuleBlock`

## 1.4.5

### Patch Changes

- 6a6eed9: fix: support `TSImportType`

## 1.4.4

### Patch Changes

- b683171: fix: support `TSModuleDeclaration`

## 1.4.3

### Patch Changes

- 030c3ec: fix: correctly escape `\r`

## 1.4.2

### Patch Changes

- faa865e: fix: including sourcemap mappings for block statement brackets

## 1.4.1

### Patch Changes

- 10c6156: fix: escape newlines when quoting strings

## 1.4.0

### Minor Changes

- d97e56f: feat: add option for quote and indentation styles

## 1.3.7

### Patch Changes

- 4c784f6: fix: move @changesets/cli to dev dependencies

## 1.3.6

### Patch Changes

- 333b32c: chore: verify changesets setup, again

## 1.3.5

### Patch Changes

- a6c0031: chore: verify changesets setup

## 1.3.4

- Transfer repo to `sveltejs`

## 1.3.3

- Support `export * as` ([#16](https://github.com/sveltejs/esrap/pull/16))
- Support indexed access types ([#18](https://github.com/sveltejs/esrap/pull/18))

## 1.3.2

- Loosen types ([#15](https://github.com/sveltejs/esrap/pull/15))

## 1.3.1

- Fix types

## 1.3.0

- Support TypeScript nodes ([#13](https://github.com/sveltejs/esrap/pull/13))

## 1.2.3

- Wrap object expression statements in parentheses ([#14](https://github.com/sveltejs/esrap/pull/14))

## 1.2.2

- Correctly handle arrow functions where body includes an object expression ([#9](https://github.com/sveltejs/esrap/pull/9))

## 1.2.1

- Support default and namespace import in same declaration ([#8](https://github.com/sveltejs/esrap/pull/8))

## 1.2.0

- Rewrite for better performance ([#7](https://github.com/sveltejs/esrap/pull/7))

## 1.1.1

- Actually add the changes that were supposed to go in 1.1.0

## 1.1.0

- Tweak output ([#5](https://github.com/sveltejs/esrap/pull/5))

## 1.0.3

- Fix typo ([#4](https://github.com/sveltejs/esrap/pull/4))

## 1.0.2

- Collapse empty bodies ([#3](https://github.com/sveltejs/esrap/pull/3))

## 1.0.1

- Better types

## 1.0.0

- First release
