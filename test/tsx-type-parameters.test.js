// @ts-check
import { expect, test } from 'vitest';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';
import tsx from '../src/languages/tsx/index.js';
import { acornParse } from './common.js';

test('disambiguates TSX output even when the input has no trailing comma', () => {
	const input = 'const identity = <T>(value: T): T => value;';
	const { ast } = acornParse(input);
	const { code } = print(ast, tsx());

	expect(code).toBe('const identity = <T,>(value: T): T => value;');
	expect(() => acornParse(code, { jsxMode: true, fileExtension: 'tsx' })).not.toThrow();
	expect(print(ast, ts()).code).toBe(input);
});

test.each([
	'async <T,>',
	'async <const T,>',
	'<T extends object,>',
	'<T = string,>',
	'<T extends object = object,>'
])('prints %s arrows as valid TSX', (parameters) => {
	const input = `const identity = ${parameters}(value: T) => value;`;
	const { ast } = acornParse(input, { jsxMode: true, fileExtension: 'tsx' });
	const { code } = print(ast, tsx());

	expect(code).toBe(input);
	expect(() => acornParse(code, { jsxMode: true, fileExtension: 'tsx' })).not.toThrow();
});
