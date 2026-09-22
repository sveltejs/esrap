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
	{
		source: 'for /* foo */ await /* bar */ (const x of y) {}',
		keywords: ['for', 'await', 'const']
	},
	{
		source: 'async /* comment */ function f() { return 42; }',
		keywords: ['async', 'function', 'return']
	},
	{
		source: 'export\n default /* comment */ function f() {}',
		keywords: ['export', 'default', 'function']
	},
	{
		source: 'declare /* comment */ let x: number;',
		keywords: ['declare', 'let']
	},
	{
		source: 'import /* comment */ type { X } from "foo";',
		keywords: ['import', 'type']
	},
	{
		source: 'class C { public /* comment */ static readonly x = 1; get y() { return 2; } }',
		keywords: ['class', 'public', 'static', 'readonly', 'get', 'return']
	},
	{
		source: 'if (x) { a(); } /* comment */ else { b(); }',
		keywords: ['if', 'else']
	},
	{
		source: 'try { a(); } /* a */ catch (e) { b(); } /* b */ finally { c(); }',
		keywords: ['try', 'catch', 'finally']
	},
	{
		source: 'do { a(); } /* comment */ while (x);',
		keywords: ['do', 'while']
	},
	{
		source: 'switch (x) { case 1: break; default: throw x; }',
		keywords: ['switch', 'case', 'break', 'default', 'throw']
	}
])('does not map declaration or control-flow keywords: $source', ({ source, keywords }) => {
	const { code, mappings } = mapped(source);
	for (const keyword of keywords) {
		const index = code.indexOf(keyword);
		expect(index).toBeGreaterThanOrEqual(0);
		const { gen_line, gen_col } = generatedLineColumn(code, index);
		expect(
			mappings[gen_line]?.find((segment) => segment[0] === gen_col),
			keyword
		).toBeUndefined();
	}
});

test('comments between loop keywords do not affect identifier mappings', () => {
	const source = 'for /* foo */ await /* bar */ (const x of y) {}';
	const { code, mappings } = mapped(source);
	for (const name of ['x', 'y']) {
		expect(mappingAtSubstring(code, name, mappings).slice(2)).toEqual([0, source.indexOf(name)]);
	}
});

test.each(['new Thing();', 'await value;', 'function* f() { yield* values; }', 'import("foo");'])(
	'prints runtime expressions without locations: %s',
	(source) => {
		const { ast } = acornParse(source);
		const without_locations = JSON.parse(
			JSON.stringify(ast, (key, value) => (key === 'loc' ? undefined : value))
		);
		const { code, map } = print(without_locations, ts(), { sourceMapEncodeMappings: false });
		expect(code).toBe(print(ast, ts()).code);
		expect(map.mappings.flat()).toEqual([]);
	}
);

test('no positive whitespace mapping directly after keyword', () => {
	// Positive source-map segment at gen_col == keyword_end (e.g. space after
	// keyword) causes downstream source-map consumers to treat whitespace columns
	// as adjacent expression positions.
	for (const source of [
		`function f() {\n\treturn x ?? 1;\n}`,
		`function g() {\n\treturn a || b;\n}`,
		`async function h() {\n\tawait p();\n}`,
		`function f() { throw new Error(); }`,
		`function* g() { yield* values; }`,
		`import /* comment */ ("foo");`,
		`const k = 1;`,
		`let m = 1;`
	]) {
		const { code, mappings } = mapped(source);
		for (const keyword of [
			'return',
			'await',
			'const',
			'let',
			'function',
			'new',
			'yield',
			'import'
		]) {
			const idx = code.indexOf(keyword);
			if (idx < 0) continue;
			const end_idx = idx + keyword.length;
			const { gen_line, gen_col } = generatedLineColumn(code, end_idx);
			const line_segments = mappings[gen_line] || [];
			const offender = line_segments.find((s) => s[0] === gen_col && s.length >= 4);
			expect(
				offender,
				`expected no positive mapping at gen ${gen_line + 1}:${gen_col} (just after \`${keyword}\` in ${JSON.stringify(source)}), got ${JSON.stringify(offender)}`
			).toBeUndefined();
		}
	}
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
