// @ts-check
import { expect, test } from 'vitest';
import { acornParse, oxcParse } from './common.js';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';
import tsx from '../src/languages/tsx/index.js';

for (const [name, language] of Object.entries({ ts, tsx })) {
	for (const parse of [acornParse, oxcParse]) {
		for (const source of [
			"export * from './a';",
			"export * as ns from './a';",
			"export type * from './a';",
			"export type * as ns from './a';"
		]) {
			test(`${name}, ${parse.name}: ${source}`, () => {
				const { ast } = parse(source);
				const { code } = print(ast, language());
				expect(code).toBe(source);
			});
		}
	}
}
