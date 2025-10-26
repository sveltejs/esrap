// @ts-check

import { test } from 'vitest';
import { acornParse } from './common';
import { print } from '../src';
import { expect } from 'vitest';
import ts from '../src/languages/ts/index.js';

const test_code = "const foo = () => { const bar = 'baz' }";

test('default indent type is tab', () => {
	const { ast } = acornParse(test_code);
	const code = print(ast, ts()).code;

	expect(code).toMatchInlineSnapshot(`
		"const foo = () => {
			const bar = 'baz';
		};"
	`);
});

test('two space indent', () => {
	const { ast } = acornParse(test_code);
	const code = print(ast, ts(), { indent: '  ' }).code;

	expect(code).toMatchInlineSnapshot(`
		"const foo = () => {
		  const bar = 'baz';
		};"
	`);
});

test('four space indent', () => {
	const { ast } = acornParse(test_code);
	const code = print(ast, ts(), { indent: '    ' }).code;

	expect(code).toMatchInlineSnapshot(`
		"const foo = () => {
		    const bar = 'baz';
		};"
	`);
});
