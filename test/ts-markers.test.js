// @ts-check
/**
 * Regression tests for silently-dropped TypeScript markers — modifiers and type
 * parameters that esrap was omitting, which changes a program's type contract.
 *
 * Each test prints valid TS and asserts the exact output (which must also still
 * be valid TS).
 */
import { expect, test } from 'vitest';
import { acornParse } from './common.js';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';

/** @param {string} input */
function printed(input) {
	const { ast } = acornParse(input);
	const code = print(ast, ts()).code;
	// everything here must remain valid TypeScript
	expect(() => acornParse(code)).not.toThrow();
	return code;
}

// optional parameters (`a?: T`)
test('keeps `?` on optional function parameters', () => {
	expect(printed('function f(a?: number) {}')).toBe('function f(a?: number) {}');
});

test('keeps `?` on optional arrow / method / signature parameters', () => {
	expect(printed('const g = (a?: number) => a;')).toBe('const g = (a?: number) => a;');
	expect(printed('class C { m(a?: number) {} }')).toBe('class C {\n\tm(a?: number) {}\n}');
	expect(printed('interface I { m(a?: number): void; }')).toBe(
		'interface I { m(a?: number): void }'
	);
	expect(printed('type F = (a?: number) => void;')).toBe('type F = (a?: number) => void;');
});

// class field modifiers
test('keeps optional `?` and definite `!` on class fields', () => {
	expect(printed('class A { x?: number; }')).toBe('class A {\n\tx?: number;\n}');
	expect(printed('class A { x!: number; }')).toBe('class A {\n\tx!: number;\n}');
});

test('keeps `readonly`, `declare`, `override` on class fields', () => {
	expect(printed('class A { readonly x = 1; }')).toBe('class A {\n\treadonly x = 1;\n}');
	expect(printed('class A { declare x: number; }')).toBe('class A {\n\tdeclare x: number;\n}');
	expect(printed('class A extends B { override y = 1; }')).toBe(
		'class A extends B {\n\toverride y = 1;\n}'
	);
	expect(printed('class A { public static readonly x = 1; }')).toBe(
		'class A {\n\tpublic static readonly x = 1;\n}'
	);
});

// class & method type parameters
test('keeps type parameters on classes', () => {
	expect(printed('class A<T> {}')).toBe('class A<T> {}');
	expect(printed('class A<T extends string = number> extends B<T> {}')).toBe(
		'class A<T extends string = number> extends B<T> {}'
	);
	expect(printed('const C = class A<T> {};')).toBe('const C = class A<T> {};');
});

test('keeps type parameters on methods', () => {
	expect(printed('class A { m<T>(x: T): T { return x; } }')).toBe(
		'class A {\n\tm<T>(x: T): T {\n\t\treturn x;\n\t}\n}'
	);
	expect(printed('class A { static async m<T>(): Promise<T> {} }')).toBe(
		'class A {\n\tstatic async m<T>(): Promise<T> {}\n}'
	);
});

// type-parameter modifiers
test('keeps `const` / `in` / `out` type-parameter modifiers', () => {
	expect(printed('function f<const T>(a: T): T { return a; }')).toBe(
		'function f<const T>(a: T): T {\n\treturn a;\n}'
	);
	expect(printed('class A<in T, out U> {}')).toBe('class A<in T, out U> {}');
});

// mapped-type modifiers
test('keeps mapped-type `readonly` / `?` modifiers and `as` remapping', () => {
	expect(printed('type M = { readonly [K in T]: V };')).toBe('type M = {readonly [K in T]: V};');
	expect(printed('type M = { [K in T]?: V };')).toBe('type M = {[K in T]?: V};');
	expect(printed('type M = { -readonly [K in T]-?: V };')).toBe(
		'type M = {-readonly [K in T]-?: V};'
	);
	expect(printed('type M = { +readonly [K in T]+?: V };')).toBe(
		'type M = {+readonly [K in T]+?: V};'
	);
	expect(printed('type M = { [K in T as `g${K & string}`]: V };')).toBe(
		'type M = {[K in T as `g${K & string}`]: V};'
	);
});
