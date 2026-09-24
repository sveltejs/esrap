// @ts-check
import { expect, test } from 'vitest';
import { transpile } from 'typescript';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';
import { acornParse, oxcParse } from './common.js';

for (const parse of [acornParse, oxcParse]) {
	test.each([
		'x?.a!.b;',
		'(x?.a)!.b;',
		'x?.a!();',
		'(x?.a)!();',
		'x?.a![key];',
		'(x?.a)![key];',
		'x?.a!!.b;'
	])(`${parse.name} preserves optional-chain boundaries in %s`, (source) => {
		const { code } = print(parse(source).ast, ts());
		expect(code).toBe(source);
		expect(print(parse(code).ast, ts()).code).toBe(code);
	});
}

test.each(['x?.a!.b', 'x?.a!()', '(x?.a)!.b', '(x?.a)!()'])(
	'preserves runtime short-circuiting in %s',
	(expression) => {
		const source = `return ${expression};`;
		const { ast } = oxcParse(source);
		const { code } = print(ast, ts());
		const evaluate = new Function('x', transpile(code));

		if (expression.startsWith('(')) {
			expect(() => evaluate(null)).toThrow(TypeError);
		} else {
			expect(evaluate(null)).toBeUndefined();
		}
	}
);
