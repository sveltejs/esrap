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
 * @param {{ preserveParens?: boolean, boundaryTokens?: boolean }} [opts]
 */
function mapped(source, opts = {}) {
	const { ast, comments } = acornParse(source, {
		preserveParens: opts.preserveParens,
		sourceType: 'module',
		jsxMode: false,
		// @ts-expect-error test driver matches `test/esrap.test.js` parser options
		fileExtension: 'ts'
	});
	const { code, map } = print(ast, ts({ comments, boundaryTokens: opts.boundaryTokens }), {
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

test('source mappings land on keywords (let / function / async / export)', () => {
	{
		const { source, code, mappings } = mapped(`let alpha = 1;`);
		const segment = mappingAtSubstring(code, 'let', mappings);
		expect(segment[2]).toBe(0);
		expect(segment[3]).toBe(source.indexOf('let'));
	}

	{
		const { source, code, mappings } = mapped(`async function bar() {}`);
		const seg_async = mappingAtSubstring(code, 'async', mappings);
		expect(seg_async[2]).toBe(0);
		expect(seg_async[3]).toBe(source.indexOf('async'));

		const seg_fn = mappingAtSubstring(code, 'function', mappings);
		expect(seg_fn[2]).toBe(0);
		expect(seg_fn[3]).toBe(source.indexOf('function'));
	}

	{
		const { source, code, mappings } = mapped(`export default function qux() {}`);
		const seg_export = mappingAtSubstring(code, 'export', mappings);
		expect(seg_export[2]).toBe(0);
		expect(seg_export[3]).toBe(source.indexOf('export'));

		const seg_default = mappingAtSubstring(code, 'default', mappings);
		expect(seg_default[2]).toBe(0);
		expect(seg_default[3]).toBe(source.indexOf('default'));

		const seg_fn = mappingAtSubstring(code, 'function', mappings);
		expect(seg_fn[2]).toBe(0);
		expect(seg_fn[3]).toBe(source.indexOf('function'));
	}
});

test('declare let maps declare and let separately', () => {
	const { source, code, mappings } = mapped(`declare let beta: number;`);

	const seg_declare = mappingAtSubstring(code, 'declare', mappings);
	expect(seg_declare[2]).toBe(0);
	expect(seg_declare[3]).toBe(source.indexOf('declare'));

	const seg_let = mappingAtSubstring(code, 'let', mappings);
	expect(seg_let[2]).toBe(0);
	expect(seg_let[3]).toBe(source.indexOf('let'));
});

test('class static and get map to source keywords', () => {
	{
		const { source, code, mappings } = mapped(`class C { static meth() {} }`);

		const seg_static = mappingAtSubstring(code, 'static', mappings);
		expect(seg_static[3]).toBe(source.indexOf('static'));
	}

	{
		const { source, code, mappings } = mapped(`class D { get x() { return 1; } }`);

		const seg_get = mappingAtSubstring(code, 'get', mappings);
		expect(seg_get[3]).toBe(source.indexOf('get'));
	}
});

test('throw / return / await map to source keywords', () => {
	{
		const { source, code, mappings } = mapped(`function f() { throw new Error('x'); }`);
		const seg = mappingAtSubstring(code, 'throw', mappings);
		expect(seg[3]).toBe(source.indexOf('throw'));
	}

	{
		const { source, code, mappings } = mapped(`function f() { return 42; }`);
		const seg = mappingAtSubstring(code, 'return', mappings);
		expect(seg[3]).toBe(source.indexOf('return'));
	}

	{
		const { source, code, mappings } = mapped(`async function f() { await thing(); }`);
		const seg = mappingAtSubstring(code, 'await', mappings);
		expect(seg[3]).toBe(source.indexOf('await'));
	}
});

test('if / else map to source keywords', () => {
	const { source, code, mappings } = mapped(`if (x) { a(); } else { b(); }`);

	const seg_if = mappingAtSubstring(code, 'if', mappings);
	expect(seg_if[3]).toBe(source.indexOf('if'));

	const seg_else = mappingAtSubstring(code, 'else', mappings);
	expect(seg_else[3]).toBe(source.indexOf('else'));
});

test('try / catch / finally map to source keywords', () => {
	const { source, code, mappings } = mapped(`try { a(); } catch (e) { b(); } finally { c(); }`);

	const seg_try = mappingAtSubstring(code, 'try', mappings);
	expect(seg_try[3]).toBe(source.indexOf('try'));

	const seg_catch = mappingAtSubstring(code, 'catch', mappings);
	expect(seg_catch[3]).toBe(source.indexOf('catch'));

	const seg_finally = mappingAtSubstring(code, 'finally', mappings);
	expect(seg_finally[3]).toBe(source.indexOf('finally'));
});

test('do / while map to source keywords', () => {
	const { source, code, mappings } = mapped(`do { a(); } while (cond);`);

	const seg_do = mappingAtSubstring(code, 'do', mappings);
	expect(seg_do[3]).toBe(source.indexOf('do'));

	const seg_while = mappingAtSubstring(code, 'while', mappings);
	expect(seg_while[3]).toBe(source.indexOf('while'));
});

test('switch / case / default map to source keywords', () => {
	const { source, code, mappings } = mapped(`switch (x) { case 1: a(); break; default: b(); }`);

	const seg_switch = mappingAtSubstring(code, 'switch', mappings);
	expect(seg_switch[3]).toBe(source.indexOf('switch'));

	const seg_case = mappingAtSubstring(code, 'case', mappings);
	expect(seg_case[3]).toBe(source.indexOf('case'));

	const seg_default = mappingAtSubstring(code, 'default', mappings);
	expect(seg_default[3]).toBe(source.indexOf('default'));
});

test('decorator-prefixed class falls back gracefully', () => {
	const source = `@dec\nclass D {}`;
	const { code, mappings } = mapped(source);

	expect(code).toContain('class');
	expect(mappings.length).toBeGreaterThan(0);
});

test('source mappings anchor array and object brackets', () => {
	{
		const { source, code, mappings } = mapped(`const points = [];`, { boundaryTokens: true });

		const seg_open = mappingAtSubstring(code, '[', mappings);
		expect(seg_open[3]).toBe(source.indexOf('['));

		const seg_close = mappingAtSubstring(code, ']', mappings);
		expect(seg_close[3]).toBe(source.indexOf(']'));
	}

	{
		const { source, code, mappings } = mapped(`const box = { a: 1 };`, { boundaryTokens: true });

		const seg_open = mappingAtSubstring(code, '{', mappings);
		expect(seg_open[3]).toBe(source.indexOf('{'));

		const seg_close = mappingAtSubstring(code, '}', mappings);
		expect(seg_close[3]).toBe(source.indexOf('}'));
	}

	{
		// Destructured parameter defaults: the pattern's braces are its span.
		const { source, code, mappings } = mapped(`const use = ({ a = 1 } = {}) => a;`, {
			boundaryTokens: true
		});

		const seg_open = mappingAtSubstring(code, '{', mappings);
		expect(seg_open[3]).toBe(source.indexOf('{'));
	}
});

test('source mappings anchor unary operators', () => {
	const { source, code, mappings } = mapped(`const neg = -value;`, { boundaryTokens: true });

	const seg = mappingAtSubstring(code, '-', mappings);
	expect(seg[3]).toBe(source.indexOf('-'));
});

test('source mappings anchor the closing tokens of calls and computed access', () => {
	{
		const { source, code, mappings } = mapped(`const item = items[index + 1];`, {
			boundaryTokens: true
		});

		const seg_close = mappingAtSubstring(code, ']', mappings);
		expect(seg_close[3]).toBe(source.indexOf(']'));
	}

	{
		const { source, code, mappings } = mapped(`const dir = compute();`, { boundaryTokens: true });

		const seg_close = mappingAtSubstring(code, ')', mappings);
		expect(seg_close[3]).toBe(source.indexOf(')'));
	}
});

test('source mappings anchor preserved parentheses', () => {
	const { source, code, mappings } = mapped(`const x = (a - 1) % b;`, {
		preserveParens: true,
		boundaryTokens: true
	});

	const seg_open = mappingAtSubstring(code, '(', mappings);
	expect(seg_open[3]).toBe(source.indexOf('('));

	const seg_close = mappingAtSubstring(code, ')', mappings);
	expect(seg_close[3]).toBe(source.indexOf(')'));
});
