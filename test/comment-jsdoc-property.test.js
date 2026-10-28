// @ts-check
import { expect, test } from 'vitest';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';
import tsx from '../src/languages/tsx/index.js';
import { acornParse } from './common.js';

test.each([ts, tsx])('preserves property keys before JSDoc casts', (language) => {
	for (const input of [
		'g({ x, n: /** @type {"a"} */ (n) });',
		'g({ n: /* note */ /** @type {number} */ (n) });',
		'g({ n: /**\n * @type {number}\n */ (n) });'
	]) {
		const { ast, comments } = acornParse(input, { fileExtension: 'js' });
		const { code } = print(ast, language({ comments }));

		expect(code).toContain('n:');
		expect(code).toContain('@type');
		expect(() => acornParse(code, { fileExtension: 'js' })).not.toThrow();
	}
});

test('still normalizes uncommented properties to shorthand', () => {
	const { ast } = acornParse('g({ n: (n) });', { fileExtension: 'js' });
	expect(print(ast, ts()).code).toBe('g({ n });');
});
