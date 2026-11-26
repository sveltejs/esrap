// @ts-check
/** @import { TSESTree } from '@typescript-eslint/types' */
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { walk } from 'zimmerframe';
import { print } from '../src/index.js';
import { acornParse } from './common.js';
import ts from '../src/languages/ts/index.js';
import tsx from '../src/languages/tsx/index.js';

const source = readFileSync(
	new URL('./samples/negative-numeric-literals/input.js', import.meta.url),
	'utf8'
);

for (const [name, language] of Object.entries({ ts, tsx })) {
	for (const with_tokens of [false, true]) {
		for (const bigint_string of [false, true]) {
			test(`${name}: generated negative literals, tokens ${with_tokens}, bigint string ${bigint_string}`, () => {
				const tokens = with_tokens ? [] : undefined;
				const { ast } = acornParse(source, { fileExtension: 'js', tokens });
				const generated = walk(/** @type {TSESTree.Node} */ (ast), null, {
					UnaryExpression(node, { next }) {
						if (
							node.operator === '-' &&
							node.argument.type === 'Literal' &&
							(typeof node.argument.value === 'number' || typeof node.argument.value === 'bigint')
						) {
							const value = -node.argument.value;
							// Model constants created by AST builders, without a source spelling.
							return /** @type {any} */ ({
								type: 'Literal',
								loc: node.loc,
								...(typeof value === 'bigint' && bigint_string
									? { value: null, bigint: String(value) }
									: { value })
							});
						}

						next();
					}
				});
				const { code } = print(generated, language(), { tokens });
				expect(() => acornParse(code, { fileExtension: 'js' })).not.toThrow();
				expect(new Function(`${code}; return values;`)()).toEqual([
					1,
					4,
					-0,
					0,
					-0,
					1n,
					4n,
					0.5,
					1,
					3,
					'-1'
				]);
			});
		}
	}
}
