// Verify that print() accepts nodes from different type systems
// without type errors (e.g. @types/estree vs @typescript-eslint/types)
// `pnpm check` should pass

import { expect, test } from 'vitest';
import { parse } from 'acorn';
import { print } from 'esrap';
import ts from 'esrap/languages/ts';
import { acornParse } from './common.js';

test('estree nodes with ts() visitors', () => {
	const ast = /** @type {import('estree').Node} */ (
		parse('const x = 1;', {
			ecmaVersion: 'latest',
			sourceType: 'module'
		})
	);

	const { code } = print(ast, ts());

	expect(code).toBe('const x = 1;');
});

test('@typescript-eslint/types nodes with ts() visitors', () => {
	const { ast } = acornParse('const x: number = 1;');

	const { code } = print(ast, ts());

	expect(code).toBe('const x: number = 1;');
});
