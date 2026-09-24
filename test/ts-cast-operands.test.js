// @ts-check
import { expect, test } from 'vitest';
import { parseSync } from 'oxc-parser';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';
import { acornParse } from './common.js';

test.each([
	'(w as any) = [1];',
	'(w satisfies any) += 1;',
	'(<any>w) = 1;',
	'(Map as any)++;',
	'++(Map as any);',
	'(w satisfies any)--;',
	'--(w satisfies any);',
	'(<any>w)++;',
	'++(<any>w);',
	'((M.g as any)<any>)([1]);',
	'const f = (M.g satisfies any)<any>;',
	'const f = (<any>M.g)<any>;',
	'const f = (a ? b : c)<any>;',
	'const f = (a || b)<any>;'
])('preserves compound operands in %s', (source) => {
	const { ast } = acornParse(source);
	const { code } = print(ast, ts());
	expect(code).toBe(source);
	expect(parseSync('input.ts', code).errors).toEqual([]);

	// Compare expression structure as well as syntax: casts must not absorb the
	// update operator or the instantiation's type arguments.
	const clean = (/** @type {unknown} */ value) =>
		JSON.parse(
			JSON.stringify(value, (key, value) =>
				['start', 'end', 'loc', 'range'].includes(key) ? undefined : value
			)
		);
	expect(clean(acornParse(code).ast)).toEqual(clean(ast));
});
