// @ts-check

import { test } from 'vitest';
import { print } from '../src/index.js';
import { expect } from 'vitest';
import { acornParse } from './common.js';
import { walk } from 'zimmerframe';
import ts from '../src/languages/ts/index.js';

/** @import { TSESTree } from '@typescript-eslint/types' */

/**
 * Removes the `raw` property from all `Literal` nodes, as the printer is prefering it's
 * value. Only if the `raw` value is not present it will try to add the prefered quoting
 * @param {TSESTree.Node} ast
 */
function clean(ast) {
	walk(ast, null, {
		Literal(node, { next }) {
			// @ts-expect-error
			delete node.raw;

			next();
		}
	});
}

const test_code = "const foo = 'bar'";

test('default quote type is single', () => {
	const { ast } = acornParse(test_code);
	clean(ast);
	const code = print(ast, ts()).code;

	expect(code).toMatchInlineSnapshot(`"const foo = 'bar';"`);
});

test('single quotes used when single quote type provided', () => {
	const { ast } = acornParse(test_code);
	clean(ast);
	const code = print(ast, ts({ quotes: 'single' })).code;

	expect(code).toMatchInlineSnapshot(`"const foo = 'bar';"`);
});

test('double quotes used when double quote type provided', () => {
	const { ast } = acornParse(test_code);
	clean(ast);
	const code = print(ast, ts({ quotes: 'double' })).code;

	expect(code).toMatchInlineSnapshot(`"const foo = "bar";"`);
});

test('escape single quotes if present in string literal', () => {
	const { ast } = acornParse('const foo = "b\'ar"');
	clean(ast);
	const code = print(ast, ts({ quotes: 'single' })).code;

	expect(code).toMatchInlineSnapshot(`"const foo = 'b\\'ar';"`);
});

test('escape double quotes if present in string literal', () => {
	const { ast } = acornParse("const foo = 'b\"ar'");
	clean(ast);
	const code = print(ast, ts({ quotes: 'double' })).code;

	expect(code).toMatchInlineSnapshot(`"const foo = "b\\"ar";"`);
});

test('escapes new lines', () => {
	const { ast } = acornParse('const str = "a\\nb"');
	clean(ast);
	const code = print(ast, ts()).code;

	expect(code).toMatchInlineSnapshot(`"const str = 'a\\nb';"`);
});

test('escapes escape characters', () => {
	const { ast } = acornParse('const str = "a\\\\nb"');
	clean(ast);
	const code = print(ast, ts()).code;

	expect(code).toMatchInlineSnapshot(`"const str = 'a\\\\nb';"`);
});

test('escapes escape characters#2', () => {
	const { ast } = acornParse('const str = "a\\\\\\nb"');
	clean(ast);
	const code = print(ast, ts()).code;

	expect(code).toMatchInlineSnapshot(`"const str = 'a\\\\\\nb';"`);
});

test('escapes double escaped backslashes', () => {
	const { ast } = acornParse("var text = $.text('\\\\\\\\');");
	clean(ast);
	const code = print(ast, ts()).code;

	expect(code).toMatchInlineSnapshot(`"var text = $.text('\\\\\\\\');"`);
});

test('does not escape already-escaped single quotes', () => {
	const { ast } = acornParse(`const str = 'a\\'b'`);
	clean(ast);
	const code = print(ast, ts()).code;

	expect(code).toMatchInlineSnapshot(`"const str = 'a\\'b';"`);
});

test('does not escape already-escaped double quotes', () => {
	const { ast } = acornParse('const str = "a\\"b"');
	clean(ast);
	const code = print(ast, ts()).code;

	expect(code).toMatchInlineSnapshot(`"const str = 'a"b';"`);
});

test('correctly handle \\n\\r', () => {
	const { ast } = acornParse('const str = "a\\n\\rb"');
	clean(ast);
	const code = print(ast, ts()).code;

	expect(code).toMatchInlineSnapshot(`"const str = 'a\\n\\rb';"`);
});
