// @ts-check
// Verify that print() accepts nodes from different type systems
// without type errors (e.g. @types/estree vs @typescript-eslint/types).
// The runtime behavior is identical - these tests exist to catch
// type incompatibilities that would break consumers at `tsc` time.
// See also: `pnpm check`

import { expect, test } from 'vitest';
import { parse } from 'acorn';
import { print } from 'esrap';
// Import through the package exports to check the public types.
import ts from 'esrap/languages/ts';
import tsx from 'esrap/languages/tsx';
import { acornParse } from './common.js';

const languages = [
	{ name: 'ts', visitors: ts },
	{ name: 'tsx', visitors: tsx }
];

test.each(languages)('estree nodes with $name() visitors', ({ visitors }) => {
	const ast = parse('const x = 1;', { ecmaVersion: 'latest', sourceType: 'module' });

	const { code } = print(ast, visitors());

	expect(code).toBe('const x = 1;');
});

test.each(languages)('@typescript-eslint/types nodes with $name() visitors', ({ visitors }) => {
	const { ast } = acornParse('const x: number = 1;');

	const { code } = print(ast, visitors());

	expect(code).toBe('const x: number = 1;');
});

test('acorn TS printer preserves module and mapped-type keywords', () => {
	const input = 'declare module "svelte" {\n}\n\ntype M = { [K in keyof JSON]: K }\n';
	const { ast, comments } = acornParse(input);

	const { code } = print(ast, ts({ comments }));

	expect(code).toBe('declare module "svelte" {\n}\n\ntype M = {[K in keyof JSON]: K};');
});

test('TSJSDocNullableType prefix and postfix', () => {
	/** @type {any} */
	const ast = {
		type: 'Program',
		body: [
			{
				type: 'TSTypeAliasDeclaration',
				id: { type: 'Identifier', name: 'A' },
				typeAnnotation: {
					type: 'TSJSDocNullableType',
					typeAnnotation: { type: 'TSNumberKeyword' },
					postfix: false
				}
			},
			{
				type: 'TSTypeAliasDeclaration',
				id: { type: 'Identifier', name: 'B' },
				typeAnnotation: {
					type: 'TSJSDocNullableType',
					typeAnnotation: { type: 'TSNumberKeyword' },
					postfix: true
				}
			}
		],
		sourceType: 'module'
	};

	const { code } = print(ast, ts());
	expect(code).toBe('type A = ?number;\ntype B = number?;');
});
