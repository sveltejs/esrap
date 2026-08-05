// @ts-check

import { test } from 'vitest';
import { acornParse } from './common';
import { print } from '../src';
import { expect } from 'vitest';
import ts from '../src/languages/ts/index.js';

const test_code = "const foo = () => { const bar = 'baz' }";

const nested_test_code = `
function foo() {
	if (bar) {
		baz();
	}
	// a comment
	qux();
}
`;

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

test('empty indent still emits newlines', () => {
	const { ast, comments } = acornParse(nested_test_code);
	const code = print(ast, ts({ comments }), { indent: '' }).code;

	expect(code).toMatchInlineSnapshot(`
		"function foo() {
		if (bar) {
		baz();
		}

		// a comment
		qux();
		}"
	`);
});
