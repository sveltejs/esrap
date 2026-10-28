// @ts-check
import { expect, test } from 'vitest';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';
import tsx from '../src/languages/tsx/index.js';
import { acornParse } from './common.js';

for (const [name, language] of /** @type {const} */ ([
	['ts', ts],
	['tsx', tsx]
])) {
	test(`${name}: a parenthesized string does not introduce strict mode`, () => {
		const source = "function f(value = 1) { ('use strict'); return value; }";
		const { ast } = acornParse(source, { fileExtension: 'js', sourceType: 'script' });
		const { code } = print(ast, language());

		expect(() => acornParse(code, { fileExtension: 'js', sourceType: 'script' })).not.toThrow();
		expect(new Function(`${code}\nreturn f();`)()).toBe(1);
	});

	test(`${name}: a parenthesized string keeps a function in sloppy mode`, () => {
		const { ast } = acornParse("function f() { ('use strict'); return this; }", {
			fileExtension: 'js',
			sourceType: 'script'
		});
		const { code } = print(ast, language());

		expect(new Function(`${code}\nreturn f();`)()).toBe(globalThis);
	});

	test(`${name}: real directives, including an empty directive, stay directives`, () => {
		const { ast } = acornParse("''; 'use strict'; function f() { return this; }", {
			fileExtension: 'js',
			sourceType: 'script'
		});
		const { code } = print(ast, language());
		const { ast: reparsed } = acornParse(code, { fileExtension: 'js', sourceType: 'script' });

		expect(reparsed.body.slice(0, 2)).toMatchObject([
			{ directive: '' },
			{ directive: 'use strict' }
		]);
		expect(new Function(`${code}\nreturn f();`)()).toBeUndefined();
	});
}
