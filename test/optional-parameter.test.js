// @ts-check
import { expect, test } from 'vitest';
import { acornParse } from './common.js';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';

/** @param {string} input */
function printed(input) {
	const { ast } = acornParse(input);
	return print(ast, ts()).code;
}

// `?` on optional identifiers must be preserved (see #139)
test.each([
	'const f = (o?: { A?: string }) => {};',
	'function a(disabled?) {}',
	'function openEventForm(startDate?, endDate?, allDay = false) {}'
])('preserves `?` on optional identifiers: %j', (input) => {
	expect(printed(input)).toBe(input);
});
