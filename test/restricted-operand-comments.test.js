// @ts-check
import { expect, test } from 'vitest';
import { acornParse } from './common.js';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';
import tsx from '../src/languages/tsx/index.js';

for (const [name, language] of Object.entries({ ts, tsx })) {
	for (const comment of ['// note\n', '/* note\nmore */', '/* note inline */', '']) {
		for (const tokens of [undefined, []]) {
			test(`${name}: restricted operand ${JSON.stringify(comment)}, tokens ${!!tokens}`, () => {
				const source = `let seen = 0;
function throwing() { throw (${comment}++seen); }
function* yielding() { yield (${comment}++seen); yield* (${comment}[++seen]); }
function returning() { return (${comment}++seen); }`;
				const { ast, comments } = acornParse(source, { tokens });
				const { code } = print(ast, language({ comments }), { tokens });
				expect(() => acornParse(code)).not.toThrow();
				const observe = `
const iterator = yielding();
const first = iterator.next();
const afterFirst = seen;
const second = iterator.next();
let thrown;
try { throwing(); } catch (value) { thrown = value; }
return JSON.stringify([first, afterFirst, second, thrown, returning(), seen]);`;
				expect(new Function(code + observe)()).toBe(new Function(source + observe)());
				expect(code.includes('note')).toBe(!!comment);
			});
		}
	}
}

for (const [name, language] of Object.entries({ ts, tsx })) {
	test(`${name}: yield evaluates its commented operand before suspending`, () => {
		const source = 'let seen = 0; function* f() { yield (\n// note\n++seen); }';
		const { ast, comments } = acornParse(source);
		const { code } = print(ast, language({ comments }));
		const observe =
			'\nconst iterator = f(); const first = iterator.next(); return JSON.stringify([first, seen]);';
		expect(new Function(code + observe)()).toBe(new Function(source + observe)());
	});
}
