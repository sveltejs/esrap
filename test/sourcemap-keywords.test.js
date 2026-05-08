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
 */
function mapped(source) {
	const { ast, comments } = acornParse(source, {
		sourceType: 'module',
		jsxMode: false,
		// @ts-expect-error test driver matches `test/esrap.test.js` parser options
		fileExtension: 'ts'
	});
	const { code, map } = print(ast, ts({ comments }), {
		sourceMapSource: 'input.ts',
		sourceMapContent: source,
		sourceMapEncodeMappings: false
	});
	expect(map.mappings).toBeTruthy();
	const mappings = /** @type {[number, number, number, number][][]} */ (/** @type {unknown} */ (map.mappings));
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
