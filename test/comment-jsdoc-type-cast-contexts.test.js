// @ts-check
import { expect, test } from 'vitest';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';
import tsx from '../src/languages/tsx/index.js';
import { acornParse } from './common.js';

/** @param {unknown} ast */
function without_locations(ast) {
	return JSON.parse(
		JSON.stringify(ast, (key, value) =>
			['start', 'end', 'loc', 'raw'].includes(key) ? undefined : value
		)
	);
}

// Keep this standalone: the sample harness's mandatory second print currently drops
// the cast parentheses. A fixture would change the original conditions or assertions.
test.each([
	{ name: 'ts', language: ts },
	{ name: 'tsx', language: tsx }
])('preserves the key for a cast on a destructuring default target ($name)', ({ language }) => {
	const input = '({ x: (/** @type {number} */ (x)) = 1 } = source);';
	const { ast, comments } = acornParse(input, { fileExtension: 'js' });
	const { code } = print(ast, language({ comments }));

	expect(code).toBe('({ x: /** @type {number} */ (x) = 1 } = source);');
	const { ast: reparsed } = acornParse(code, { fileExtension: 'js' });
	expect(without_locations(reparsed)).toEqual(without_locations(ast));
});
