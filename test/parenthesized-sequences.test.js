// @ts-check
import { expect, test } from 'vitest';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';
import { acornParse, oxcParse } from './common.js';

for (const parse of [acornParse, oxcParse]) {
	test.each([
		'(0, f)("x");',
		'((0, f))("x");',
		'(0, object).property;',
		'new (0, Constructor)();',
		'!(0, value);',
		'(0, value) + (1, other);',
		'(a + b) * c;'
	])(`${parse.name} does not accumulate parentheses: %s`, (source) => {
		let code = source;
		for (let i = 0; i < 3; i += 1) {
			const { ast, comments } = parse(code, { fileExtension: 'js', preserveParens: true });
			code = print(ast, ts({ comments })).code;
			expect(code).toBe(source);
		}
	});
}

test('preserves a JSDoc cast around a parenthesized sequence', () => {
	const source = 'const x = /** @type {number} */ (0, value);';
	const { ast, comments } = acornParse(source, { fileExtension: 'js', preserveParens: true });
	expect(print(ast, ts({ comments })).code).toBe(source);
});

test('parenthesized sequences also print once without locations', () => {
	const { ast } = acornParse('(0, f)();', { fileExtension: 'js', preserveParens: true });
	const without_locations = JSON.parse(
		JSON.stringify(ast, (key, value) => (key === 'loc' ? undefined : value))
	);
	expect(print(without_locations, ts()).code).toBe('(0, f)();');
});
