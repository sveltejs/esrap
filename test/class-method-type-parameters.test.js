// @ts-check
import { expect, test } from 'vitest';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';
import { acornParse, oxcParse } from './common.js';

for (const parse of [acornParse, oxcParse]) {
	test.each([
		'm<T>(x: T): T {}',
		'static m<T extends string = string>(x: T): T {}',
		'async *[method]<T>(x: T): AsyncGenerator<T> {}',
		'abstract m<T>(x: T): T;',
		'm?<T>(x: T): T;',
		'm<T>(x: T): T;\n\tm(x: unknown): unknown {}'
	])(`${parse.name} preserves class method type parameters: %s`, (method) => {
		const source = `abstract class A {\n\t${method}\n}`;
		const { code } = print(parse(source).ast, ts());
		expect(code).toBe(source);
		expect(print(parse(code).ast, ts()).code).toBe(code);
	});
}
