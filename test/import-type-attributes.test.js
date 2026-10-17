// @ts-check
import { expect, test } from 'vitest';
import { oxcParse } from './common.js';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';

// acorn-typescript cannot parse import attributes on an import type, so oxc parses this

/**
 * @param {string} input
 */
function printed(input) {
	const { ast } = oxcParse(input, { fileExtension: 'ts' });
	return print(ast, ts()).code;
}

test('keeps the import attributes of an import type', () => {
	expect(printed(`type A = import("foo", { with: { type: "json" } });`)).toBe(
		`type A = import("foo", { with: { type: "json" } });`
	);
});

test('keeps the legacy `assert` form', () => {
	expect(printed(`type B = import("x", { assert: { type: "json" } });`)).toBe(
		`type B = import("x", { assert: { type: "json" } });`
	);
});

test('keeps a quoted `resolution-mode` attribute', () => {
	expect(
		printed(`type C = import("pkg", { with: { "resolution-mode": "require" } }).Mode<string>;`)
	).toBe(`type C = import("pkg", { with: { "resolution-mode": "require" } }).Mode<string>;`);
});

test('keeps the attributes inside the parentheses, before the qualifier', () => {
	expect(printed(`type D = import("m", { with: { type: "json" } }).Ns.Deep<number>;`)).toBe(
		`type D = import("m", { with: { type: "json" } }).Ns.Deep<number>;`
	);
});

test('a type query keeps the attributes too', () => {
	expect(printed(`type E = typeof import("foo", { with: { type: "json" } });`)).toBe(
		`type E = typeof import("foo", { with: { type: "json" } });`
	);
});

test('an import type without attributes is unchanged', () => {
	expect(printed(`type F = import("plain");`)).toBe(`type F = import("plain");`);
});
