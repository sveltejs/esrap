// @ts-check

import { expect, test } from 'vitest';
import { acornParse, oxcParse } from './common.js';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';
import tsx from '../src/languages/tsx/index.js';

for (const [name, language] of Object.entries({ ts, tsx })) {
	for (const parse of [acornParse, oxcParse]) {
		for (const expression of [
			'{} || 0 || 1',
			'{} + 0',
			'({} || 0) ? 1 : 2',
			'{} + 0 + 1',
			'{} instanceof Object',
			'{}',
			'{} || 0',
			'({} || 0) && 1',
			'0 + {}',
			'function () {}',
			'class {}'
		]) {
			test(`${name}, ${parse.name}: arrow body ${expression}`, () => {
				const source = `const f = () => (${expression});`;
				const { ast } = parse(source);
				const { code } = print(ast, language());

				expect(() => acornParse(code)).not.toThrow();
				const observe = '\nreturn JSON.stringify(f());';
				expect(new Function(code + observe)()).toBe(new Function(source + observe)());
			});
		}
	}
}
