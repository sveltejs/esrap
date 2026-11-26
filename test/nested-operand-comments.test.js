// @ts-check
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { print } from '../src/index.js';
import { acornParse } from './common.js';
import ts from '../src/languages/ts/index.js';
import tsx from '../src/languages/tsx/index.js';

const source = readFileSync(
	new URL('./samples/comment-restricted-operands-nested/input.js', import.meta.url),
	'utf8'
);

const observe = `
let seen = 0;
const iterator = yielding({ next: () => ++seen, items: [42] });
const first = iterator.next();
const after_first = seen;
const second = iterator.next();
let thrown;
try { throwing({ answer: 42 }); } catch (value) { thrown = value; }
return [
	member({ answer: 42 }), call(() => 42), binary(41), conditional(true),
	optional(null), optional({ answer: 42 }), tagged(() => 42), sequence(42),
	inline({ answer: 42 }), thrown, first.value, after_first, second.value,
	iterator.next().done, plain(42), [...bare()]
];`;

for (const [name, language] of Object.entries({ ts, tsx })) {
	for (const with_tokens of [false, true]) {
		test(`${name}: nested comment in an operand without a source location, tokens ${with_tokens}`, () => {
			const tokens = with_tokens ? [] : undefined;
			const { ast, comments } = acornParse(source, { fileExtension: 'js', tokens });
			const declaration = /** @type {any} */ (ast.body[0]);
			delete declaration.body.body[0].argument.loc;
			const { code } = print(declaration, language({ comments }), { tokens });
			expect(new Function(`${code}; return member({ answer: 42 });`)()).toBe(42);
		});

		for (const preserveParens of [false, true]) {
			test(`${name}: nested operand comments, tokens ${with_tokens}, parentheses ${preserveParens}`, () => {
				const tokens = with_tokens ? [] : undefined;
				const { ast, comments } = acornParse(source, {
					fileExtension: 'js',
					tokens,
					preserveParens
				});
				const { code } = print(ast, language({ comments }), { tokens });
				expect(new Function(source + observe)()).toEqual([
					42,
					42,
					42,
					42,
					undefined,
					42,
					42,
					42,
					42,
					42,
					1,
					1,
					42,
					true,
					42,
					[undefined]
				]);
				expect(new Function(code + observe)()).toEqual(new Function(source + observe)());
				expect(acornParse(code, { fileExtension: 'js' }).comments.map((c) => c.value)).toEqual(
					comments.map((c) => c.value)
				);
			});
		}
	}
}
