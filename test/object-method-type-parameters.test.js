// @ts-check
import { expect, test } from 'vitest';
import { oxcParse } from './common.js';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';

// acorn-typescript cannot parse type parameters on object-literal methods, so oxc parses this
test('object-literal methods keep their type parameters', () => {
	const input = `const object = {
	async *[method]<T>(value: T): AsyncGenerator<T> {},
	get [getter](): T { return value; },
	set [setter](value: T) {}
};`;

	const { ast, comments } = oxcParse(input, { fileExtension: 'ts' });

	expect(print(ast, ts({ comments })).code).toBe(`const object = {
	async *[method]<T>(value: T): AsyncGenerator<T> {},
	get [getter](): T {
		return value;
	},
	set [setter](value: T) {}
};`);
});
