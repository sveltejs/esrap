// @ts-check
import { describe, expect, test } from 'vitest';
import { parseSync } from 'oxc-parser';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';
import tsx from '../src/languages/tsx/index.js';

for (const language of [ts, tsx]) {
	describe(language === ts ? 'ts' : 'tsx', () => {
		for (const source of [
			"import defer * as feature from './feature.js';",
			"import source wasm from './module.wasm';",
			"import.defer('./feature.js');",
			"import.source('./module.wasm');",
			"import.source('./module.wasm', { with: { type: 'webassembly' } });",
			"import * as feature from './feature.js';",
			"import source from './ordinary.js';",
			"import('./ordinary.js');"
		]) {
			test(source, () => {
				const input = parseSync('input.ts', source);
				expect(input.errors).toEqual([]);
				const { code } = print(/** @type {any} */ (input.program), language());
				const output = parseSync('output.ts', code);
				expect(output.errors).toEqual([]);
				const normalize = (/** @type {any} */ value) =>
					JSON.parse(
						JSON.stringify(value, (key, item) =>
							['start', 'end', 'raw'].includes(key) ? undefined : item
						)
					);
				expect(normalize(output.program)).toEqual(normalize(input.program));
			});
		}
	});
}
