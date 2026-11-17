// @ts-check
import { describe, expect, test } from 'vitest';
import { runInNewContext } from 'node:vm';
import typescript from 'typescript';
import { parseSync } from 'oxc-parser';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';
import tsx from '../src/languages/tsx/index.js';
import { acornParse } from './common.js';

for (const language of [ts, tsx]) {
	for (const parser of ['acorn', 'oxc']) {
		describe(`${language === ts ? 'ts' : 'tsx'} / ${parser}`, () => {
			for (const parameter of [
				'@dec private x = 1',
				'@dec public readonly x: number',
				'@dec protected x?: number',
				'@dec x: number',
				'private x = 1'
			]) {
				test(parameter, () => {
					const source = `const seen: number[] = []; function dec(_target: object, _key: unknown, index: number) { seen.push(index); } class C { constructor(${parameter}) {} }`;
					const parsed = parseSync('input.ts', source);
					expect(parsed.errors).toEqual([]);
					const ast = parser === 'oxc' ? parsed.program : acornParse(source).ast;
					const before = JSON.stringify(ast);
					const output = print(/** @type {any} */ (ast), language()).code;
					expect(JSON.stringify(ast)).toBe(before);
					expect(parseSync('output.ts', output).errors).toEqual([]);
					const evaluate = (/** @type {string} */ code) =>
						Array.from(
							runInNewContext(
								typescript.transpileModule(code, {
									compilerOptions: {
										experimentalDecorators: true,
										target: typescript.ScriptTarget.ES2022
									}
								}).outputText + '\nseen'
							)
						);
					expect(evaluate(output)).toEqual(evaluate(source));
					expect(evaluate(output)).toEqual(parameter.startsWith('@') ? [0] : []);
				});
			}
		});
	}
}
