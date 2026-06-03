// @ts-check
import { expect, test } from 'vitest';
import { acornParse } from './common.js';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';

/** @param {string} input */
function printed(input) {
	const { ast } = acornParse(input);
	return print(ast, ts()).code;
}

// nested same-sign unary operators must not be glued into `--`/`++`, which would
// change the meaning (`-(-a)` -> `--a` is the decrement operator) or be invalid
test.each([
	['-(-a);', '- -a;'],
	['+(+a);', '+ +a;'],
	['-(--a);', '- --a;']
])('prints %j as %j without gluing operators', (input, expected) => {
	const code = printed(input);
	expect(code).toBe(expected);
	expect(() => acornParse(code)).not.toThrow();
});

// a parenthesized optional chain is a separate chain — dropping the parentheses
// changes its short-circuiting behaviour or produces invalid output
test.each([
	'(a?.b)();',
	'(a?.b).c;',
	'new (a?.b)();',
	'delete (a?.b).c;',
	'(a?.b)`x`;',
	'(a?.())();'
])('keeps parentheses around %j', (input) => {
	expect(printed(input)).toBe(input);
});

// genuine optional chains must not gain parentheses
test.each(['a?.b.c;', 'a?.b().c;', 'a?.b?.c;'])('leaves %j untouched', (input) => {
	expect(printed(input)).toBe(input);
});

// `await` is not a valid left operand of `**` and must stay parenthesized
test('keeps parentheses around an `await` operand of `**`', () => {
	const code = printed('async () => (await a) ** b;');
	expect(code).toBe('async () => (await a) ** b;');
	expect(() => acornParse(code)).not.toThrow();
});
