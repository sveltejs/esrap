// @ts-check
import { expect, test } from 'vitest';
import ts from '../src/languages/ts/index.js';
import { print } from '../src/index.js';
import { acornParse } from './common.js';

/**
 * @param {string} code
 * @param {number} index
 */
function generatedLineColumn(code, index) {
	const before = code.slice(0, index);
	const nl = [...before.matchAll(/\n/g)];
	const gen_line = nl.length;
	const gen_col = before.length - (before.lastIndexOf('\n') + 1);
	return { gen_line, gen_col };
}

/**
 * @param {string} code
 * @param {string} needle
 * @param {[number, number, number, number][][]} mappings
 * @returns {[number, number, number, number]}
 */
function mappingAtSubstring(code, needle, mappings) {
	const idx = code.indexOf(needle);
	expect(idx >= 0, `needle not in output: ${JSON.stringify(needle)}`).toBe(true);
	const { gen_line, gen_col } = generatedLineColumn(code, idx);
	const line = mappings[gen_line];
	expect(line).toBeDefined();
	const line_segments = /** @type {[number, number, number, number][]} */ (line);

	const segment = line_segments.find((s) => s[0] === gen_col);
	expect(segment).toBeDefined();
	return /** @type {[number, number, number, number]} */ (segment);
}

/**
 * @param {string} source
 * @param {{ preserveParens?: boolean }} [opts]
 */
function mapped(source, opts = {}) {
	const { ast, comments } = acornParse(source, {
		preserveParens: opts.preserveParens,
		sourceType: 'module',
		jsxMode: false,
		fileExtension: 'ts'
	});
	const { code, map } = print(ast, ts({ comments }), {
		sourceMapSource: 'input.ts',
		sourceMapContent: source,
		sourceMapEncodeMappings: false
	});
	expect(map.mappings).toBeTruthy();
	const mappings = /** @type {[number, number, number, number][][]} */ (
		/** @type {unknown} */ (map.mappings)
	);
	return { source, code, mappings };
}

test.each([
	['function f() {\n\tthrow new /* comment */\nError("x");\n}', 'new'],
	['async function f() {\n\tawait /* comment */\nvalue;\n}', 'await'],
	['async function f() {\n\tawait (a || b);\n}', 'await'],
	['function* f() {\n\tyield /* comment */ *\nvalues;\n}', 'yield'],
	['function* f() {\n\tyield;\n}', 'yield'],
	['const p =\n\timport /* comment */\n("foo");', 'import']
])('maps runtime expression starts: %s', (source, keyword) => {
	const { code, mappings } = mapped(source);
	const segment = mappingAtSubstring(code, keyword, mappings);
	const { gen_line, gen_col } = generatedLineColumn(source, source.indexOf(keyword));
	expect(segment.slice(2)).toEqual([gen_line, gen_col]);
});

test.each([
	['switch (n) {\n\tcase 1:\n\t\tbreak;\n\tdefault:\n\t\tbreak;\n}', 'case'],
	['switch (n) {\n\tcase 1:\n\t\tbreak;\n\tdefault:\n\t\tbreak;\n}', 'default'],
	['try {\n\tf();\n} catch (e) {\n\tg(e);\n}', 'catch'],
	['try {\n\tf();\n} catch {\n\tg();\n}', 'catch'],
	['for (const k in o) {\n\tf(k);\n}', 'const k'],
	['for (let i = 0; i < n; i++) {\n\tf(i);\n}', 'let i'],
	['for await (const v of s) {\n\tf(v);\n}', 'const v'],
	['class A {\n\tm(@dec x: number) {}\n}', '@dec']
])('maps the start of nodes printed inline: %s', (source, needle) => {
	const { code, mappings } = mapped(source);
	const segment = mappingAtSubstring(code, needle, mappings);
	const { gen_line, gen_col } = generatedLineColumn(source, source.indexOf(needle));
	expect(segment.slice(2)).toEqual([gen_line, gen_col]);
});
