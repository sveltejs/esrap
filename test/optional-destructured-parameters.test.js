// @ts-check

import { expect, test } from 'vitest';
import { acornParse, oxcParse } from './common.js';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';
import tsx from '../src/languages/tsx/index.js';

for (const [name, language] of Object.entries({ ts, tsx })) {
	for (const parse of [acornParse, oxcParse]) {
		for (const source of [
			'declare function f([x]?: number[]): void;',
			'declare function f({ x }?: { x: number }): void;',
			'type F = ([x]?: number[]) => void;',
			'type F = ({ x }?: { x: number }) => void;',
			'declare function f([x]: number[]): void;',
			'declare function f({ x }: { x: number }): void;',
			'declare function f(x?: number): void;'
		]) {
			test(`${name}, ${parse.name}: ${source}`, () => {
				const { ast } = parse(source);
				const { code } = print(ast, language());

				expect(code).toBe(source);
				expect(() => parse(code)).not.toThrow();
			});
		}
	}
}
