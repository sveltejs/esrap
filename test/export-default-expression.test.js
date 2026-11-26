// @ts-check
import { expect, test } from 'vitest';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';
import tsx from '../src/languages/tsx/index.js';
import { acornParse } from './common.js';

for (const [name, language] of Object.entries({ ts, tsx })) {
	for (const expression of [
		'function inner() {}',
		'class inner {}',
		'async function* inner() {}',
		'function inner() {} || null',
		'class inner {} ? 42 : 0'
	]) {
		for (const with_tokens of [false, true]) {
			test(`${name}: default export ${expression}, tokens ${with_tokens}`, async () => {
				const source = `export default (${expression});\nexport const visible = typeof inner;`;
				const tokens = with_tokens ? [] : undefined;
				const { ast } = acornParse(source, { fileExtension: 'js', tokens });
				const { code } = print(ast, language(), { tokens });

				expect(() => acornParse(code, { fileExtension: 'js' })).not.toThrow();
				const original = await import(`data:text/javascript,${encodeURIComponent(source)}`);
				const generated = await import(`data:text/javascript,${encodeURIComponent(code)}`);
				expect(generated.visible).toBe(original.visible);
				expect(typeof generated.default).toBe(typeof original.default);
				expect(generated.default?.name).toBe(original.default?.name);
			});
		}
	}
}
