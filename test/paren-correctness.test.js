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

// nested same-sign unary operators must not be glued into `--`/`++`, which would
// change the meaning (`-(-a)` -> `--a` is the decrement operator) or be invalid.
// these transform the input, so we also assert the output re-parses cleanly
test.each([
	['-(-a);', '- -a;'],
	['+(+a);', '+ +a;'],
	['-(--a);', '- --a;']
])('prints %j as %j without gluing operators', (input, expected) => {
	const code = printed(input);
	expect(code).toBe(expected);
	expect(() => acornParse(code)).not.toThrow();
});

// each of these must round-trip unchanged: dropping or adding parentheses here
// would change meaning or produce invalid code
test.each([
	// a parenthesized optional chain is a separate chain
	'(a?.b)();',
	'(a?.b).c;',
	'new (a?.b)();',
	'delete (a?.b).c;',
	'(a?.b)`x`;',
	'(a?.())();',
	// `await` is not a valid left operand of `**`
	'async () => (await a) ** b;',
	// `?:` is right-associative, so a conditional in the test position keeps its
	// parens, else `(a ? b : c) ? d : e` re-associates to `a ? b : (c ? d : e)`
	'(a ? b : c) ? d : e;',
	'(a ? b : c) ? d : e ? f : g;',
	// genuine optional chains must not gain parentheses
	'a?.b.c;',
	'a?.b().c;',
	'a?.b?.c;',
	// a conditional in the alternate position needs no parentheses
	'a ? b : c ? d : e;'
])('%j round-trips with correct parentheses', (input) => {
	expect(printed(input)).toBe(input);
});
