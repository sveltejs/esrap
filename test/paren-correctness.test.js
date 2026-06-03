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

test('keeps a space between nested unary minus operators', () => {
	const code = printed('-(-a);');
	expect(code).toBe('- -a;');
	expect(() => acornParse(code)).not.toThrow();
});

test('keeps a space between nested unary plus operators', () => {
	const code = printed('+(+a);');
	expect(code).toBe('+ +a;');
	expect(() => acornParse(code)).not.toThrow();
});

test('keeps a space between a unary minus and a prefix decrement', () => {
	const code = printed('-(--a);');
	expect(code).toBe('- --a;');
	expect(() => acornParse(code)).not.toThrow();
});

// a parenthesized optional chain is a separate chain — dropping the parentheses
// changes its short-circuiting behaviour or produces invalid output

test('keeps parentheses around an optional chain that is called', () => {
	const code = printed('(a?.b)();');
	expect(code).toBe('(a?.b)();');
	expect(() => acornParse(code)).not.toThrow();
});

test('keeps parentheses around an optional chain that is a member object', () => {
	const code = printed('(a?.b).c;');
	expect(code).toBe('(a?.b).c;');
	expect(() => acornParse(code)).not.toThrow();
});

test('keeps parentheses around an optional chain in a `new` callee', () => {
	const code = printed('new (a?.b)();');
	expect(code).toBe('new (a?.b)();');
	expect(() => acornParse(code)).not.toThrow();
});

test('keeps parentheses around an optional chain under `delete`', () => {
	const code = printed('delete (a?.b).c;');
	expect(code).toBe('delete (a?.b).c;');
	expect(() => acornParse(code)).not.toThrow();
});

test('keeps parentheses around an optional chain used as a template tag', () => {
	const code = printed('(a?.b)`x`;');
	expect(code).toBe('(a?.b)`x`;');
	expect(() => acornParse(code)).not.toThrow();
});

test('keeps parentheses around an optional call that is itself called', () => {
	const code = printed('(a?.())();');
	expect(code).toBe('(a?.())();');
	expect(() => acornParse(code)).not.toThrow();
});

test('does not parenthesize genuine optional chains', () => {
	for (const input of ['a?.b.c;', 'a?.b().c;', 'a?.b?.c;']) {
		expect(printed(input)).toBe(input);
	}
});

// `await` is not a valid left operand of `**` and must stay parenthesized

test('keeps parentheses around an `await` operand of `**`', () => {
	const code = printed('async () => (await a) ** b;');
	expect(code).toBe('async () => (await a) ** b;');
	expect(() => acornParse(code)).not.toThrow();
});
