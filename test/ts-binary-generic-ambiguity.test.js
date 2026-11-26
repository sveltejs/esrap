// @ts-check
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import typescript from 'typescript';
import { print } from '../src/index.js';
import { acornParse } from './common.js';
import ts from '../src/languages/ts/index.js';
import tsx from '../src/languages/tsx/index.js';

const source = readFileSync(
	new URL('./samples/ts-binary-generic-ambiguity/input.ts', import.meta.url),
	'utf8'
);

/** @param {string} code */
function evaluate(code) {
	const result = typescript.transpileModule(code, {
		compilerOptions: { target: typescript.ScriptTarget.ES2022 },
		reportDiagnostics: true
	});
	expect(
		result.diagnostics?.map((diagnostic) =>
			typescript.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
		)
	).toEqual([]);
	return new Function(`${result.outputText}; return results;`)();
}

for (const [name, language] of Object.entries({ ts, tsx })) {
	for (const with_tokens of [false, true]) {
		test(`${name}: binary operands stay distinct from generic arguments, tokens ${with_tokens}`, () => {
			const tokens = with_tokens ? [] : undefined;
			const { ast } = acornParse(source, { tokens });
			const { code } = print(ast, language(), { tokens });
			expect(evaluate(code)).toEqual(evaluate(source));
		});
	}
}
