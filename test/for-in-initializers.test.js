// @ts-check
import { expect, test } from 'vitest';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';
import { acornParse, oxcParse } from './common.js';

/**
 * @param {string} expression
 * @param {boolean} wrap
 * @param {string} [fileExtension]
 */
function check_initializer(expression, wrap, fileExtension = 'js') {
	for (const prefix of ['', 'let value = ']) {
		const { ast } = acornParse(`for (${prefix}(${expression});;);`, { fileExtension });
		const { code } = print(ast, ts());

		expect(code).toBe(`for (${prefix}${wrap ? `(${expression})` : expression}; ; ) ;`);
		expect(() => acornParse(code, { fileExtension })).not.toThrow();
	}
}

test.each([
	'key in object',
	'enabled && key in object',
	'key in object || enabled',
	'enabled ?? key in object',
	'key in object === true',
	'true === key in object',
	'key in object < value',
	'key in object ? yes : no',
	'enabled ? true : key in object',
	'present = key in object',
	'present ||= key in object',
	'() => key in object',
	'() => () => key in object',
	'() => enabled ? true : key in object'
])('parenthesizes an exposed `in`: %s', (expression) => {
	check_initializer(expression, true);
});

test.each([
	'check(key in object)',
	'new Check(key in object)',
	'(key in object)()',
	'(key in object).value',
	'object[key in other]',
	'object?.[key in other]',
	'check?.(key in object)',
	'import(key in object)',
	'[key in object]',
	'{ value: key in object }',
	'{ [key in object]: true }',
	'`${key in object}`',
	'tag`${key in object}`',
	'(key in object)``',
	'(key in object, value)',
	'!(key in object)',
	'typeof (key in object)',
	'await (key in object)',
	'1 + (key in object)',
	'(key in object) + 1',
	'value < (key in object)',
	'(enabled && key in object) ?? value',
	'enabled ? key in object : false',
	'(flag ? key in object : false) ? yes : no',
	'() => ({ value: key in object })',
	'() => ({} && key in object)',
	'() => ({} ? true : key in object)',
	'() => ({ value } = key in object)',
	'(value = key in object) => value',
	'() => {\n\treturn key in object;\n}',
	'function () {\n\treturn key in object;\n}',
	'class {\n\tvalue = key in object;\n}'
])('avoids redundant parentheses around a protected `in`: %s', (expression) => {
	check_initializer(expression, false);
});

test.each([
	'key in object as boolean',
	'key in object satisfies boolean',
	'key in object as boolean === true'
])('parenthesizes an exposed `in` through TypeScript expressions: %s', (expression) => {
	check_initializer(expression, true, 'ts');
});

test.each([
	'(enabled && key in object) as boolean',
	'(enabled && key in object) satisfies boolean',
	'(key in object as number) | mask',
	'(key in object)!',
	'<boolean>(key in object)'
])('avoids redundant parentheses around a protected TypeScript `in`: %s', (expression) => {
	check_initializer(expression, false, 'ts');
});

test.each([
	['yield key in object', true],
	['yield* key in object', true],
	['yield check(key in object)', false],
	['yield (key in object, value)', false]
])('handles `in` in a yield argument: %s', (expression, wrap) => {
	const { ast } = acornParse(`function* test() { for (let value = (${expression});;); }`, {
		fileExtension: 'js'
	});
	const { code } = print(ast, ts());

	expect(code).toBe(
		`function* test() {\n\tfor (let value = ${wrap ? `(${expression})` : expression}; ; ) ;\n}`
	);
	expect(() => acornParse(code, { fileExtension: 'js' })).not.toThrow();
});

test.each(['acorn', 'oxc'])('recognizes explicit parentheses from %s', (parser) => {
	const input = 'for (let present = (key in object); ; ) ;';
	const { ast } =
		parser === 'acorn'
			? acornParse(input, { fileExtension: 'js', preserveParens: true })
			: oxcParse(input, { fileExtension: 'js' });

	expect(print(ast, ts()).code).toBe(input);
});
