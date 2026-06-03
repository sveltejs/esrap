// @ts-check
/**
 * Regression tests for parentheses required by specific grammar positions —
 * the `extends` clause, a tagged-template tag, a decorator expression, the left
 * of `**`, and the start of an expression statement. Dropping them produces
 * invalid output or changes the meaning.
 *
 * Each test asserts the exact output, which must also be valid to re-parse.
 */
import { expect, test } from 'vitest';
import { acornParse } from './common.js';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';

/** @param {string} input @param {{ jsx?: boolean }} [opts] */
function printed(input, opts = {}) {
	const { ast } = acornParse(input, { jsxMode: opts.jsx });
	const code = print(ast, ts()).code;
	expect(() => acornParse(code, { jsxMode: opts.jsx })).not.toThrow();
	return code;
}

// `extends` clause is a LeftHandSideExpression
test('wraps a non-trivial `extends` super-class', () => {
	expect(printed('class A extends (B || C) {}')).toBe('class A extends (B || C) {}');
	expect(printed('class A extends (cond ? B : D) {}')).toBe('class A extends (cond ? B : D) {}');
	expect(printed('const C = class extends (a = b) {};')).toBe(
		'const C = class extends (a = b) {};'
	);
});

test('does not wrap a valid `extends` super-class', () => {
	expect(printed('class A extends B.C {}')).toBe('class A extends B.C {}');
	expect(printed('class A extends new B() {}')).toBe('class A extends new B() {}');
	expect(printed('class A extends f() {}')).toBe('class A extends f() {}');
});

// decorator expression
test('wraps a non-trivial decorator expression', () => {
	expect(printed('@(a ? b : c) class A {}')).toBe('@(a ? b : c)\nclass A {}');
	expect(printed('@(a || b) class A {}')).toBe('@(a || b)\nclass A {}');
});

test('does not wrap a plain decorator expression', () => {
	expect(printed('@dec class A {}')).toBe('@dec\nclass A {}');
	expect(printed('@a.b.c class A {}')).toBe('@a.b.c\nclass A {}');
	expect(printed('@a() class A {}')).toBe('@a()\nclass A {}');
});

// tagged-template tag
test('wraps a non-trivial tagged-template tag', () => {
	expect(printed('const a = (x || y)`tpl`;')).toBe('const a = (x || y)`tpl`;');
	expect(printed('const a = (x as T)`t`;')).toBe('const a = (x as T)`t`;');
});

test('does not wrap a valid tagged-template tag', () => {
	expect(printed('const a = a.b`t`;')).toBe('const a = a.b`t`;');
	expect(printed('const a = f()`t`;')).toBe('const a = f()`t`;');
});

// type assertion left of `**`
test('wraps an angle-bracket type assertion as the left of `**`', () => {
	expect(printed('const a = (<T>x) ** y;')).toBe('const a = (<T>x) ** y;');
});

// expression-statement start
test('wraps an expression statement that would start with `{`/`function`/`class`', () => {
	expect(printed('({} + []);')).toBe('({} + []);');
	expect(printed('(class {});')).toBe('(class {});');
	expect(printed('(class C {});')).toBe('(class C {});');
	expect(printed('({} ? a : b);')).toBe('({} ? a : b);');
	expect(printed('({} && a);')).toBe('({} && a);');
	expect(printed('(function () {})`x`;')).toBe('(function () {})`x`;');
});

test('does not over-wrap expression statements already safe at the start', () => {
	expect(printed('({}).x;')).toBe('({}).x;');
	expect(printed('(function () {})();')).toBe('(function () {})();');
	expect(printed('x = {};')).toBe('x = {};');
	expect(printed('[a] = b;')).toBe('[a] = b;');
});
