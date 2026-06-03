// @ts-check
/**
 * Regression tests for TypeScript constructs that esrap was printing as invalid
 * output: `asserts` type predicates (wrong token order), qualified
 * namespace/module names (mangled), and computed keys in type-member signatures
 * (brackets dropped).
 *
 * Each test asserts the exact output, which must also be valid to re-parse.
 */
import { expect, test } from 'vitest';
import { acornParse } from './common.js';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';

/** @param {string} input */
function printed(input) {
	const { ast } = acornParse(input);
	const code = print(ast, ts()).code;
	expect(() => acornParse(code)).not.toThrow();
	return code;
}

// `asserts` type predicates
test('prints `asserts` type predicates in the correct order', () => {
	expect(printed('function f(x): asserts x is string {}')).toBe(
		'function f(x): asserts x is string {}'
	);
	expect(printed('function f(x): asserts x {}')).toBe('function f(x): asserts x {}');
	expect(printed('function f(x): asserts this is Foo {}')).toBe(
		'function f(x): asserts this is Foo {}'
	);
	expect(printed('type P = (x: unknown) => asserts x is string;')).toBe(
		'type P = (x: unknown) => asserts x is string;'
	);
});

test('still prints plain `is` type predicates correctly', () => {
	expect(printed('function f(x): x is string {}')).toBe('function f(x): x is string {}');
});

// qualified namespace / module names
test('prints qualified namespace names with dots', () => {
	expect(printed('namespace A.B.C { export const x = 1; }')).toBe(
		'namespace A.B.C {\n\texport const x = 1;\n}'
	);
});

test('still prints a single-segment namespace correctly', () => {
	expect(printed('namespace A { export const x = 1; }')).toBe(
		'namespace A {\n\texport const x = 1;\n}'
	);
});

// computed keys in type-member signatures
test('keeps brackets on computed method/property signature keys', () => {
	expect(printed('interface I { [Symbol.iterator](): number; }')).toBe(
		'interface I { [Symbol.iterator](): number }'
	);
	expect(printed('type T = { [Symbol.iterator](): number };')).toBe(
		'type T = { [Symbol.iterator](): number };'
	);
});

test('does not bracket non-computed signatures or index signatures', () => {
	expect(printed('interface I { x(): void; }')).toBe('interface I { x(): void }');
	expect(printed('interface I { [k: string]: number; }')).toBe(
		'interface I { [k: string]: number }'
	);
});
